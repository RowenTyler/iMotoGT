'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import {
  Plus,
  Image as ImageIcon,
  Heading1,
  Heading2,
  Quote,
  Minus,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link as LinkIcon,
  X,
  Edit,
} from 'lucide-react';

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------
type BlockType = 'text' | 'heading' | 'subheading' | 'image' | 'quote' | 'divider';

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
// Image upload helper
// ----------------------------------------------------------------------
async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/admin/upload', {
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
// Convert EditorBlock[] to TipTap JSON
// ----------------------------------------------------------------------
function blocksToTipTapContent(blocks: EditorBlock[]): any {
  if (!blocks.length) {
    return { type: 'doc', content: [{ type: 'paragraph', content: [] }] };
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
      case 'quote':
        return {
          type: 'blockquote',
          content: block.content ? [{ type: 'text', text: block.content }] : [],
        };
      case 'divider':
        return { type: 'horizontalRule' };
      case 'image':
        return {
          type: 'image',
          attrs: {
            src: block.content,
            alt: block.sourceLabel || '',
            title: block.sourceLabel || '',
            caption: block.sourceLabel || '',
            captionUrl: block.sourceUrl || '',
          },
        };
      default:
        return { type: 'paragraph', content: [] };
    }
  });
  return { type: 'doc', content };
}

/**
 * Convert a TipTap node (with marks) into HTML string.
 */
function nodeToHtml(node: any): string {
  if (node.type === 'text') {
    let text = node.text || '';
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === 'bold') text = `<strong>${text}</strong>`;
        if (mark.type === 'italic') text = `<em>${text}</em>`;
        if (mark.type === 'underline') text = `<u>${text}</u>`;
        if (mark.type === 'strike') text = `<s>${text}</s>`;
        if (mark.type === 'link') {
          const href = mark.attrs?.href || '#';
          text = `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-orange-500 hover:underline">${text}</a>`;
        }
      }
    }
    return text;
  }
  if (node.type === 'paragraph') {
    const inner = node.content?.map((c: any) => nodeToHtml(c)).join('') || '';
    return `<p>${inner}</p>`;
  }
  return '';
}

// ----------------------------------------------------------------------
// Convert TipTap JSON to EditorBlock[] (now preserving links as HTML)
// ----------------------------------------------------------------------
function tipTapContentToBlocks(doc: any): EditorBlock[] {
  if (!doc || !doc.content) return [];
  const blocks: EditorBlock[] = [];
  let index = 0;
  for (const node of doc.content) {
    const id = `block-${Date.now()}-${index++}`;
    switch (node.type) {
      case 'paragraph': {
        const html = node.content?.map((c: any) => nodeToHtml(c)).join('') || '';
        const content = html === '<p></p>' ? '' : html;
        blocks.push({ id, type: 'text', content });
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
      case 'blockquote': {
        const text = node.content?.map((c: any) => c.text || '').join('') || '';
        blocks.push({ id, type: 'quote', content: text });
        break;
      }
      case 'horizontalRule':
        blocks.push({ id, type: 'divider', content: '' });
        break;
      case 'image':
        blocks.push({
          id,
          type: 'image',
          content: node.attrs?.src || '',
          sourceLabel: node.attrs?.caption || node.attrs?.alt || '',
          sourceUrl: node.attrs?.captionUrl || '',
        });
        break;
      default:
        blocks.push({ id, type: 'text', content: '' });
    }
  }
  return blocks;
}

// ----------------------------------------------------------------------
// Floating Plus Button with Menu
// ----------------------------------------------------------------------
interface FloatingPlusButtonProps {
  editor: any;
  onInsertBlock: (type: BlockType) => void;
}

function FloatingPlusButton({ editor, onInsertBlock }: FloatingPlusButtonProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [showMenu, setShowMenu] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!editor || !editor.isFocused) return;
    const { from, to } = editor.state.selection;
    if (from !== to) return;
    const coords = editor.view.coordsAtPos(from);
    const editorRect = editor.view.dom.getBoundingClientRect();
    setPosition({
      top: coords.top - editorRect.top + (coords.bottom - coords.top) / 2,
      left: -32,
    });
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    editor.on('selectionUpdate', updatePosition);
    editor.on('focus', updatePosition);
    updatePosition();
    return () => {
      editor.off('selectionUpdate', updatePosition);
      editor.off('focus', updatePosition);
    };
  }, [editor, updatePosition]);

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

  if (!editor || !editor.isFocused) return null;

  const menuItems = [
    { type: 'text' as const, label: 'Text', icon: <Plus size={16} /> },
    { type: 'heading' as const, label: 'Heading', icon: <Heading1 size={16} /> },
    { type: 'subheading' as const, label: 'Subheading', icon: <Heading2 size={16} /> },
    { type: 'image' as const, label: 'Image', icon: <ImageIcon size={16} /> },
    { type: 'quote' as const, label: 'Quote', icon: <Quote size={16} /> },
    { type: 'divider' as const, label: 'Divider', icon: <Minus size={16} /> },
  ];

  return (
    <div
      className="absolute z-20"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateY(-50%)',
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setShowMenu(!showMenu)}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-600 shadow-md transition hover:bg-slate-300 focus:outline-none"
        aria-label="Add block"
      >
        <Plus size={16} />
      </button>
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute left-0 top-full mt-1 z-50 w-40 rounded-md border border-slate-200 bg-white shadow-lg"
        >
          {menuItems.map((item) => (
            <button
              key={item.type}
              onClick={() => {
                onInsertBlock(item.type);
                setShowMenu(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              <span className="text-slate-400">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// Floating Toolbar (formatting + link using inline input)
// ----------------------------------------------------------------------
interface FloatingToolbarProps {
  editor: any;
}

function FloatingToolbar({ editor }: FloatingToolbarProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [visible, setVisible] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const updatePosition = useCallback(() => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    if (empty || from === to) {
      setVisible(false);
      return;
    }
    try {
      const coords = editor.view.coordsAtPos(from);
      const editorRect = editor.view.dom.getBoundingClientRect();
      setPosition({
        top: coords.top - editorRect.top - 40,
        left: coords.left - editorRect.left,
      });
      setVisible(true);
    } catch (e) {
      setVisible(false);
    }
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    editor.on('selectionUpdate', updatePosition);
    editor.on('focus', updatePosition);
    updatePosition();
    return () => {
      editor.off('selectionUpdate', updatePosition);
      editor.off('focus', updatePosition);
    };
  }, [editor, updatePosition]);

  const normalizeUrl = (url: string): string => {
    url = url.trim();
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return url; // internal link
    // Assume it's a domain, add https://
    return `https://${url}`;
  };

  const openLinkInput = () => {
    const previousUrl = editor.getAttributes('link').href || '';
    setLinkUrl(previousUrl);
    setShowLinkInput(true);
  };

  const saveLink = () => {
    let finalUrl = normalizeUrl(linkUrl);
    if (finalUrl === '') {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: finalUrl }).run();
    }
    setShowLinkInput(false);
    setLinkUrl('');
  };

  const cancelLink = () => {
    setShowLinkInput(false);
    setLinkUrl('');
  };

  useEffect(() => {
    if (showLinkInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showLinkInput]);

  if (!visible || !editor) return null;

  return (
    <>
      <div
        className="absolute z-30 flex gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-md"
        style={{ top: position.top, left: position.left }}
      >
        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
          className={`rounded p-1 ${editor.isActive('bold') ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
          title="Bold"
        >
          <Bold size={16} />
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
          className={`rounded p-1 ${editor.isActive('italic') ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
          title="Italic"
        >
          <Italic size={16} />
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}
          className={`rounded p-1 ${editor.isActive('underline') ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
          title="Underline"
        >
          <Underline size={16} />
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}
          className={`rounded p-1 ${editor.isActive('strike') ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
          title="Strikethrough"
        >
          <Strikethrough size={16} />
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); openLinkInput(); }}
          className={`rounded p-1 ${editor.isActive('link') ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
          title="Hyperlink"
        >
          <LinkIcon size={16} />
        </button>
      </div>
      {showLinkInput && (
        <div
          className="absolute z-40 flex gap-2 rounded-md border border-slate-200 bg-white p-2 shadow-md"
          style={{ top: position.top + 40, left: position.left }}
        >
          <input
            ref={inputRef}
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com or imotogt.co.za"
            className="w-64 rounded border border-slate-300 px-2 py-1 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveLink();
              if (e.key === 'Escape') cancelLink();
            }}
          />
          <button
            onClick={saveLink}
            className="rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600"
          >
            Apply
          </button>
          <button
            onClick={cancelLink}
            className="rounded bg-gray-300 px-2 py-1 text-xs hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      )}
    </>
  );
}

// ----------------------------------------------------------------------
// Image Component with Caption Editor
// ----------------------------------------------------------------------
interface ImageComponentProps {
  editor: any;
  node: any;
  updateAttributes: (attrs: any) => void;
  deleteNode: () => void;
}

function ImageWithCaption({ editor, node, updateAttributes, deleteNode }: ImageComponentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [caption, setCaption] = useState(node.attrs.caption || '');
  const [captionUrl, setCaptionUrl] = useState(node.attrs.captionUrl || '');

  const saveCaption = () => {
    updateAttributes({ caption, captionUrl, alt: caption });
    setIsEditing(false);
  };

  return (
    <div className="relative my-4">
      <div className="relative">
        <img src={node.attrs.src} alt={node.attrs.alt} className="max-w-full rounded-lg" />
        <div className="absolute right-2 top-2 flex gap-1">
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
              title="Edit caption"
            >
              <Edit size={14} />
            </button>
          )}
          <button
            onClick={() => deleteNode()}
            className="rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
            title="Remove image"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      {isEditing ? (
        <div className="mt-2 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption text"
            className="w-full rounded border border-slate-300 p-1 text-sm"
            autoFocus
          />
          <input
            type="text"
            value={captionUrl}
            onChange={(e) => setCaptionUrl(e.target.value)}
            placeholder="Source URL (optional)"
            className="w-full rounded border border-slate-300 p-1 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={saveCaption}
              className="rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="rounded bg-gray-300 px-2 py-1 text-xs hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        caption && (
          <div className="mt-1 text-center text-sm text-gray-500">
            {captionUrl ? (
              <a href={captionUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                {caption}
              </a>
            ) : (
              caption
            )}
          </div>
        )
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// Custom Image Extension with Caption support
// ----------------------------------------------------------------------
const CaptionedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      caption: { default: '' },
      captionUrl: { default: '' },
    };
  },
  addNodeView() {
    return ({ editor, node, getPos, updateAttributes, deleteNode }) => {
      const dom = document.createElement('div');
      const reactRoot = (window as any).ReactDOM?.createRoot?.(dom);
      if (reactRoot) {
        reactRoot.render(
          <ImageWithCaption
            editor={editor}
            node={node}
            updateAttributes={updateAttributes}
            deleteNode={deleteNode}
          />
        );
      } else {
        dom.innerHTML = `<img src="${node.attrs.src}" alt="${node.attrs.alt}" class="max-w-full rounded-lg" />`;
      }
      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          if (reactRoot) {
            reactRoot.render(
              <ImageWithCaption
                editor={editor}
                node={updatedNode}
                updateAttributes={updateAttributes}
                deleteNode={deleteNode}
              />
            );
          } else {
            dom.innerHTML = `<img src="${updatedNode.attrs.src}" alt="${updatedNode.attrs.alt}" class="max-w-full rounded-lg" />`;
          }
          return true;
        },
        destroy: () => {
          if (reactRoot) reactRoot.unmount();
        },
      };
    };
  },
});

// ----------------------------------------------------------------------
// Helper to insert image via upload
// ----------------------------------------------------------------------
async function handleImageUpload(editor: any, file: File) {
  try {
    const url = await uploadImage(file);
    editor.chain().focus().setImage({ src: url }).run();
  } catch (err) {
    console.error('Image upload failed:', err);
    alert('Failed to upload image. Please try again.');
  }
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
  const initialContent = blocksToTipTapContent(initialBlocks);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-orange-500 underline hover:text-orange-600',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      CaptionedImage,
      Placeholder.configure({
        placeholder: 'Start writing...',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const doc = editor.getJSON();
      const blocks = tipTapContentToBlocks(doc);
      onBlocksChange(blocks);
    },
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
              handleImageUpload(editor, file);
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
              handleImageUpload(editor, file);
            }
            return true;
          }
        }
        return false;
      },
    },
  });

  const insertBlock = useCallback(
    (type: BlockType) => {
      if (!editor) return;
      if (type === 'image') {
        fileInputRef.current?.click();
        return;
      }
      const { from } = editor.state.selection;
      let command: any;
      switch (type) {
        case 'text':
          command = editor.chain().focus().insertContentAt(from, { type: 'paragraph', content: [] });
          break;
        case 'heading':
          command = editor.chain().focus().insertContentAt(from, { type: 'heading', attrs: { level: 2 }, content: [] });
          break;
        case 'subheading':
          command = editor.chain().focus().insertContentAt(from, { type: 'heading', attrs: { level: 3 }, content: [] });
          break;
        case 'quote':
          command = editor.chain().focus().insertContentAt(from, {
            type: 'blockquote',
            content: [{ type: 'paragraph', content: [] }],
          });
          break;
        case 'divider':
          command = editor.chain().focus().insertContentAt(from, { type: 'horizontalRule' });
          break;
        default:
          command = editor.chain().focus().insertContentAt(from, { type: 'paragraph', content: [] });
      }
      command?.run();
    },
    [editor]
  );

  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && editor) {
        await handleImageUpload(editor, file);
        e.target.value = '';
      }
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
          alert('Failed to upload hero image');
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
              alert('Failed to upload hero image');
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
          alert('Failed to upload hero image');
        }
      }
    },
    [onHeroImageChange]
  );

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
      />

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

      <div className="relative min-h-[300px]">
        {editor && (
          <>
            <FloatingToolbar editor={editor} />
            <FloatingPlusButton editor={editor} onInsertBlock={insertBlock} />
          </>
        )}
        <EditorContent editor={editor} />
      </div>

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
        .ProseMirror a {
          color: #f97316 !important;
          text-decoration: underline;
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