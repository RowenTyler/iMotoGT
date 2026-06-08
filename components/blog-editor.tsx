'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Plus,
  Image as ImageIcon,
  Video,
  Quote,
  Heading1,
  Heading2,
  Minus,
  X,
} from 'lucide-react';

// ----------------------------------------------------------------------
// Types (matching your existing EditorBlock interface)
// ----------------------------------------------------------------------
type BlockType = 'text' | 'image' | 'video' | 'quote' | 'divider' | 'heading' | 'subheading';

interface EditorBlock {
  id: string;
  type: BlockType;
  content: string;
  sourceLabel?: string;
  sourceUrl?: string;
}

interface BlogEditorProps {
  title: string;
  subtitle: string;
  heroImage?: string;
  onTitleChange: (title: string) => void;
  onSubtitleChange: (subtitle: string) => void;
  onHeroImageChange: (url: string) => void;
  onBlocksChange: (blocks: EditorBlock[]) => void;
  initialBlocks?: EditorBlock[];
}

// ----------------------------------------------------------------------
// Image upload helper – calls your API route
// ----------------------------------------------------------------------
async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/admin/upload', {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${response.status} ${errorText}`);
  }
  const data = await response.json();
  if (!data.url) throw new Error('No URL returned from upload');
  return data.url;
}

// ----------------------------------------------------------------------
// Convert EditorBlock[] to TipTap JSON document
// ----------------------------------------------------------------------
function blocksToTipTapDocument(blocks: EditorBlock[]): any {
  if (!blocks.length) {
    return {
      type: 'doc',
      content: [{ type: 'paragraph', content: [] }],
    };
  }

  const content = blocks.map((block) => {
    switch (block.type) {
      case 'text':
        return {
          type: 'paragraph',
          content: block.content ? [{ type: 'text', text: block.content }] : [],
        };
      case 'heading':
        return {
          type: 'heading',
          attrs: { level: 2 },
          content: block.content ? [{ type: 'text', text: block.content }] : [],
        };
      case 'subheading':
        return {
          type: 'heading',
          attrs: { level: 3 },
          content: block.content ? [{ type: 'text', text: block.content }] : [],
        };
      case 'image':
        return {
          type: 'image',
          attrs: {
            src: block.content,
            alt: block.sourceLabel || '',
            title: block.sourceLabel || '',
          },
        };
      case 'quote':
        return {
          type: 'blockquote',
          content: block.content ? [{ type: 'text', text: block.content }] : [],
        };
      case 'divider':
        return { type: 'horizontalRule' };
      case 'video':
        // Store video as a special paragraph marker (you can improve later)
        return {
          type: 'paragraph',
          content: block.content
            ? [{ type: 'text', text: `[VIDEO: ${block.content}]` }]
            : [],
        };
      default:
        return { type: 'paragraph', content: [] };
    }
  });
  return { type: 'doc', content };
}

// ----------------------------------------------------------------------
// Convert TipTap JSON document back to EditorBlock[]
// ----------------------------------------------------------------------
function tipTapDocumentToBlocks(doc: any): EditorBlock[] {
  if (!doc || !doc.content) return [];

  const blocks: EditorBlock[] = [];
  let index = 0;
  for (const node of doc.content) {
    const id = `block-${Date.now()}-${index++}`;
    switch (node.type) {
      case 'paragraph': {
        const text = node.content?.map((c: any) => c.text || '').join('') || '';
        if (text.startsWith('[VIDEO:')) {
          const url = text.slice(7, -1).trim();
          blocks.push({ id, type: 'video', content: url });
        } else {
          blocks.push({ id, type: 'text', content: text });
        }
        break;
      }
      case 'heading': {
        const level = node.attrs?.level || 2;
        const text = node.content?.map((c: any) => c.text || '').join('') || '';
        blocks.push({
          id,
          type: level === 2 ? 'heading' : 'subheading',
          content: text,
        });
        break;
      }
      case 'image':
        blocks.push({
          id,
          type: 'image',
          content: node.attrs?.src || '',
          sourceLabel: node.attrs?.alt || '',
          sourceUrl: node.attrs?.src || '',
        });
        break;
      case 'blockquote': {
        const text = node.content?.map((c: any) => c.text || '').join('') || '';
        blocks.push({ id, type: 'quote', content: text });
        break;
      }
      case 'horizontalRule':
        blocks.push({ id, type: 'divider', content: '' });
        break;
      default:
        blocks.push({ id, type: 'text', content: '' });
    }
  }
  return blocks;
}

// ----------------------------------------------------------------------
// Floating Plus Button with Block Menu
// ----------------------------------------------------------------------
interface FloatingPlusButtonProps {
  editor: any;
  onAddBlock: (type: BlockType, atPosition?: number) => void;
}

function FloatingPlusButton({ editor, onAddBlock }: FloatingPlusButtonProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [showMenu, setShowMenu] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;

    const updatePosition = () => {
      const { state } = editor;
      const { from } = state.selection;
      const coords = editor.view.coordsAtPos(from);
      const editorRect = editor.view.dom.getBoundingClientRect();
      const scrollY = window.scrollY || window.pageYOffset;
      setPosition({
        top: coords.top + scrollY - editorRect.top - 4,
        left: -32,
      });
    };

    editor.on('selectionUpdate', updatePosition);
    editor.on('update', updatePosition);
    updatePosition();

    return () => {
      editor.off('selectionUpdate', updatePosition);
      editor.off('update', updatePosition);
    };
  }, [editor]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showMenu &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  if (!editor) return null;

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleSelectBlock = (type: BlockType) => {
    onAddBlock(type);
    setShowMenu(false);
  };

  const blockOptions: { type: BlockType; label: string; icon: React.ReactNode }[] = [
    { type: 'text', label: 'Text', icon: <Plus size={16} /> },
    { type: 'heading', label: 'Heading', icon: <Heading1 size={16} /> },
    { type: 'subheading', label: 'Subheading', icon: <Heading2 size={16} /> },
    { type: 'image', label: 'Image', icon: <ImageIcon size={16} /> },
    { type: 'video', label: 'Video', icon: <Video size={16} /> },
    { type: 'quote', label: 'Quote', icon: <Quote size={16} /> },
    { type: 'divider', label: 'Divider', icon: <Minus size={16} /> },
  ];

  return (
    <div className="absolute z-20" style={{ top: `${position.top}px`, left: `${position.left}px` }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleButtonClick}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-600 shadow-md transition hover:bg-slate-300 focus:outline-none"
        style={{ transform: 'translateY(-50%)' }}
        aria-label="Add block"
      >
        <Plus size={16} />
      </button>
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute left-0 top-full mt-1 z-50 w-40 rounded-md border border-slate-200 bg-white shadow-lg"
        >
          {blockOptions.map((opt) => (
            <button
              key={opt.type}
              onClick={() => handleSelectBlock(opt.type)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              <span className="text-slate-400">{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// Main BlogEditor Component
// ----------------------------------------------------------------------
export default function BlogEditor({
  title,
  subtitle,
  heroImage,
  onTitleChange,
  onSubtitleChange,
  onHeroImageChange,
  onBlocksChange,
  initialBlocks = [],
}: BlogEditorProps) {
  const [editorReady, setEditorReady] = useState(false);
  const initialDocument = blocksToTipTapDocument(initialBlocks);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ placeholder: false }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: 'my-4 max-w-full rounded-lg' },
      }),
      Placeholder.configure({
        placeholder: 'Start writing...',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: initialDocument,
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none min-h-[300px] px-1 py-4',
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer?.files.length) {
          const files = Array.from(event.dataTransfer.files);
          files.forEach((file) => {
            if (file.type.startsWith('image/')) {
              event.preventDefault();
              uploadImage(file)
                .then((url) => {
                  editor?.chain().focus().setImage({ src: url }).run();
                })
                .catch(console.error);
            }
          });
          return true;
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        for (const item of items) {
          if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              uploadImage(file)
                .then((url) => {
                  editor?.chain().focus().setImage({ src: url }).run();
                })
                .catch(console.error);
            }
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const doc = editor.getJSON();
      const newBlocks = tipTapDocumentToBlocks(doc);
      onBlocksChange(newBlocks);
    },
    onTransaction: () => {
      if (!editorReady) setEditorReady(true);
    },
  });

  // Insert a new block of given type after the current cursor position
  const insertBlock = useCallback(
    (type: BlockType) => {
      if (!editor) return;
      const { from } = editor.state.selection;
      let newNode: any;
      switch (type) {
        case 'text':
          newNode = { type: 'paragraph', content: [] };
          break;
        case 'heading':
          newNode = { type: 'heading', attrs: { level: 2 }, content: [] };
          break;
        case 'subheading':
          newNode = { type: 'heading', attrs: { level: 3 }, content: [] };
          break;
        case 'image':
          // For image, insert an empty image node – user can later add URL via an edit modal
          newNode = { type: 'image', attrs: { src: '', alt: '' } };
          break;
        case 'quote':
          newNode = { type: 'blockquote', content: [] };
          break;
        case 'divider':
          newNode = { type: 'horizontalRule' };
          break;
        case 'video':
          newNode = {
            type: 'paragraph',
            content: [{ type: 'text', text: '[VIDEO: ]' }],
          };
          break;
        default:
          newNode = { type: 'paragraph', content: [] };
      }
      editor.chain().focus().insertContentAt(from, newNode).run();
    },
    [editor]
  );

  // ------------------------------------------------------------------
  // Hero image handlers
  // ------------------------------------------------------------------
  const heroInputRef = useRef<HTMLInputElement>(null);

  const handleHeroDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith('image/')) {
        try {
          const url = await uploadImage(file);
          onHeroImageChange(url);
        } catch (err) {
          console.error(err);
        }
      }
    },
    [onHeroImageChange]
  );

  const handleHeroPaste = useCallback(
    async (e: React.ClipboardEvent<HTMLDivElement>) => {
      const items = Array.from(e.clipboardData.items);
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            try {
              const url = await uploadImage(file);
              onHeroImageChange(url);
            } catch (err) {
              console.error(err);
            }
          }
          break;
        }
      }
    },
    [onHeroImageChange]
  );

  const handleHeroFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file?.type.startsWith('image/')) {
        try {
          const url = await uploadImage(file);
          onHeroImageChange(url);
        } catch (err) {
          console.error(err);
        }
      }
    },
    [onHeroImageChange]
  );

  return (
    <div className="space-y-6">
      {/* Hero Image Section */}
      <div
        className="relative rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleHeroDrop}
        onPaste={handleHeroPaste}
      >
        {heroImage ? (
          <div className="relative">
            <img src={heroImage} alt="Hero" className="max-h-80 w-full rounded-md object-cover" />
            <button
              type="button"
              onClick={() => onHeroImageChange('')}
              className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <ImageIcon className="h-10 w-10 text-slate-400" />
            <p className="text-sm text-slate-500">
              Drag & drop an image here, paste from clipboard, or{' '}
              <button
                type="button"
                onClick={() => heroInputRef.current?.click()}
                className="text-blue-600 underline"
              >
                browse
              </button>
            </p>
            <input
              ref={heroInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleHeroFileSelect}
            />
          </div>
        )}
      </div>

      {/* Title & Subtitle */}
      <input
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Title"
        className="w-full border-0 bg-transparent text-4xl font-bold outline-none placeholder:text-slate-300 focus:ring-0"
      />
      <input
        type="text"
        value={subtitle}
        onChange={(e) => onSubtitleChange(e.target.value)}
        placeholder="Subtitle"
        className="w-full border-0 bg-transparent text-xl text-slate-600 outline-none placeholder:text-slate-300 focus:ring-0"
      />

      {/* Editor with floating plus button */}
      <div className="relative">
        {editor && editorReady && (
          <FloatingPlusButton editor={editor} onAddBlock={insertBlock} />
        )}
        <EditorContent editor={editor} />
      </div>

      {/* Global styles */}
      <style jsx global>{`
        .ProseMirror {
          padding: 0 !important;
        }
        .ProseMirror p {
          margin: 0 0 0.75em 0 !important;
          line-height: 1.6 !important;
        }
        .ProseMirror img {
          margin: 1.5em auto !important;
          display: block !important;
          max-width: 100% !important;
        }
        .ProseMirror blockquote {
          border-left: 4px solid #3b82f6;
          margin: 1em 0;
          padding-left: 1em;
          font-style: italic;
          color: #4b5563;
        }
        .ProseMirror hr {
          margin: 2em 0;
          border: 0;
          border-top: 1px solid #e5e7eb;
        }
        .ProseMirror h2 {
          font-size: 1.8rem;
          font-weight: 700;
          margin: 1em 0 0.5em;
        }
        .ProseMirror h3 {
          font-size: 1.4rem;
          font-weight: 600;
          margin: 1em 0 0.5em;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: "Start writing...";
          float: left;
          color: #ced4da;
          pointer-events: none;
          height: 0;
          font-style: normal;
        }
      `}</style>
    </div>
  );
}