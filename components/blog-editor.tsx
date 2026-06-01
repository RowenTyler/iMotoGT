'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Plus,
  Image as ImageIcon,
  Video,
  Quote,
  Heading1,
  Heading2,
  Minus,
  X,
} from 'lucide-react'

interface BlockMenuPosition {
  top: number
  left: number
}

type BlockType = 'text' | 'image' | 'video' | 'quote' | 'divider' | 'heading' | 'subheading'

interface EditorBlock {
  id: string
  type: BlockType
  content: string
  sourceLabel?: string
  sourceUrl?: string
}

interface BlogEditorProps {
  title: string
  subtitle: string
  heroImage?: string
  onTitleChange: (title: string) => void
  onSubtitleChange: (subtitle: string) => void
  onHeroImageChange: (url: string) => void
  onBlocksChange: (blocks: EditorBlock[]) => void
  initialBlocks?: EditorBlock[]
}

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
  const [blocks, setBlocks] = useState<EditorBlock[]>(initialBlocks)
  const [activeBlockMenu, setActiveBlockMenu] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<BlockMenuPosition>({ top: 0, left: 0 })
  const menuRef = useRef<HTMLDivElement>(null)

  const handleBlockMenuClick = (blockId: string, event: React.MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    setMenuPosition({ top: rect.bottom + 4, left: rect.left })
    setActiveBlockMenu(activeBlockMenu === blockId ? null : blockId)
  }

  const addBlock = (type: BlockType, afterBlockId?: string) => {
    const newBlock: EditorBlock = {
      id: Date.now().toString(),
      type,
      content: '',
    }

    let newBlocks: EditorBlock[]
    if (afterBlockId) {
      const index = blocks.findIndex((b) => b.id === afterBlockId)
      newBlocks = [...blocks.slice(0, index + 1), newBlock, ...blocks.slice(index + 1)]
    } else {
      newBlocks = [...blocks, newBlock]
    }

    setBlocks(newBlocks)
    setActiveBlockMenu(null)
    onBlocksChange(newBlocks)
  }

  const updateBlock = (id: string, content: string, sourceLabel?: string, sourceUrl?: string) => {
    const newBlocks = blocks.map((b) =>
      b.id === id ? { ...b, content, sourceLabel, sourceUrl } : b
    )
    setBlocks(newBlocks)
    onBlocksChange(newBlocks)
  }

  const deleteBlock = (id: string) => {
    const newBlocks = blocks.filter((b) => b.id !== id)
    setBlocks(newBlocks)
    setActiveBlockMenu(null)
    onBlocksChange(newBlocks)
  }

  const renderBlock = (block: EditorBlock, index: number) => {
    switch (block.type) {
      case 'text':
        return (
          <div key={block.id} className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={(e) => handleBlockMenuClick(block.id, e)}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
              >
                <Plus size={18} className="text-gray-400" />
              </button>
              <Textarea
                value={block.content}
                onChange={(e) => updateBlock(block.id, e.target.value)}
                placeholder="Start typing..."
                className="flex-1 border-none resize-none focus:outline-none focus:ring-0 text-base leading-relaxed"
              />
            </div>
            {activeBlockMenu === block.id && (
              <BlockMenu
                position={menuPosition}
                onAddBlock={(type) => addBlock(type, block.id)}
                onClose={() => setActiveBlockMenu(null)}
                ref={menuRef}
              />
            )}
          </div>
        )

      case 'heading':
        return (
          <div key={block.id} className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={(e) => handleBlockMenuClick(block.id, e)}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
              >
                <Plus size={18} className="text-gray-400" />
              </button>
              <Input
                value={block.content}
                onChange={(e) => updateBlock(block.id, e.target.value)}
                placeholder="Heading..."
                className="flex-1 border-none focus:outline-none focus:ring-0 text-2xl font-bold"
              />
            </div>
            {activeBlockMenu === block.id && (
              <BlockMenu
                position={menuPosition}
                onAddBlock={(type) => addBlock(type, block.id)}
                onClose={() => setActiveBlockMenu(null)}
                ref={menuRef}
              />
            )}
          </div>
        )

      case 'subheading':
        return (
          <div key={block.id} className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={(e) => handleBlockMenuClick(block.id, e)}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
              >
                <Plus size={18} className="text-gray-400" />
              </button>
              <Input
                value={block.content}
                onChange={(e) => updateBlock(block.id, e.target.value)}
                placeholder="Subheading..."
                className="flex-1 border-none focus:outline-none focus:ring-0 text-xl font-semibold"
              />
            </div>
            {activeBlockMenu === block.id && (
              <BlockMenu
                position={menuPosition}
                onAddBlock={(type) => addBlock(type, block.id)}
                onClose={() => setActiveBlockMenu(null)}
                ref={menuRef}
              />
            )}
          </div>
        )

      case 'image':
        return (
          <div key={block.id} className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={(e) => handleBlockMenuClick(block.id, e)}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
              >
                <Plus size={18} className="text-gray-400" />
              </button>
              <div className="flex-1 space-y-2">
                <Input
                  value={block.content}
                  onChange={(e) => updateBlock(block.id, e.target.value, block.sourceLabel, block.sourceUrl)}
                  placeholder="Paste image URL..."
                  className="w-full"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={block.sourceLabel || ''}
                    onChange={(e) => updateBlock(block.id, block.content, e.target.value, block.sourceUrl)}
                    placeholder="Source label (optional)"
                    className="text-sm"
                  />
                  <Input
                    value={block.sourceUrl || ''}
                    onChange={(e) => updateBlock(block.id, block.content, block.sourceLabel, e.target.value)}
                    placeholder="Source URL (optional)"
                    className="text-sm"
                  />
                </div>
              </div>
              <button
                onClick={() => deleteBlock(block.id)}
                className="flex-shrink-0 text-gray-400 hover:text-red-500 transition"
              >
                <X size={18} />
              </button>
            </div>
            {block.content && (
              <div className="rounded-lg overflow-hidden">
                <img src={block.content} alt="Inserted" className="w-full h-auto" />
              </div>
            )}
            {block.sourceLabel && (
              <div className="text-sm text-gray-500">
                Source:{' '}
                {block.sourceUrl ? (
                  <a href={block.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    {block.sourceLabel}
                  </a>
                ) : (
                  <span>{block.sourceLabel}</span>
                )}
              </div>
            )}
            {activeBlockMenu === block.id && (
              <BlockMenu
                position={menuPosition}
                onAddBlock={(type) => addBlock(type, block.id)}
                onClose={() => setActiveBlockMenu(null)}
                ref={menuRef}
              />
            )}
          </div>
        )

      case 'video':
        return (
          <div key={block.id} className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={(e) => handleBlockMenuClick(block.id, e)}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
              >
                <Plus size={18} className="text-gray-400" />
              </button>
              <div className="flex-1">
                <Input
                  value={block.content}
                  onChange={(e) => updateBlock(block.id, e.target.value)}
                  placeholder="Paste video URL (YouTube, Vimeo, etc.)..."
                  className="w-full"
                />
              </div>
              <button
                onClick={() => deleteBlock(block.id)}
                className="flex-shrink-0 text-gray-400 hover:text-red-500 transition"
              >
                <X size={18} />
              </button>
            </div>
            {activeBlockMenu === block.id && (
              <BlockMenu
                position={menuPosition}
                onAddBlock={(type) => addBlock(type, block.id)}
                onClose={() => setActiveBlockMenu(null)}
                ref={menuRef}
              />
            )}
          </div>
        )

      case 'quote':
        return (
          <div key={block.id} className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={(e) => handleBlockMenuClick(block.id, e)}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
              >
                <Plus size={18} className="text-gray-400" />
              </button>
              <Textarea
                value={block.content}
                onChange={(e) => updateBlock(block.id, e.target.value)}
                placeholder="Quote..."
                className="flex-1 border-l-4 border-blue-500 pl-4 italic focus:outline-none focus:ring-0"
              />
            </div>
            {activeBlockMenu === block.id && (
              <BlockMenu
                position={menuPosition}
                onAddBlock={(type) => addBlock(type, block.id)}
                onClose={() => setActiveBlockMenu(null)}
                ref={menuRef}
              />
            )}
          </div>
        )

      case 'divider':
        return (
          <div key={block.id} className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={(e) => handleBlockMenuClick(block.id, e)}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
              >
                <Plus size={18} className="text-gray-400" />
              </button>
              <div className="flex-1 border-t border-gray-300" />
              <button
                onClick={() => deleteBlock(block.id)}
                className="flex-shrink-0 text-gray-400 hover:text-red-500 transition"
              >
                <X size={18} />
              </button>
            </div>
            {activeBlockMenu === block.id && (
              <BlockMenu
                position={menuPosition}
                onAddBlock={(type) => addBlock(type, block.id)}
                onClose={() => setActiveBlockMenu(null)}
                ref={menuRef}
              />
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto py-8">
      {/* Hero Section */}
      <div className="space-y-6">
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Article Title"
          className="text-4xl font-bold border-none focus:outline-none focus:ring-0"
        />

        <Input
          value={subtitle}
          onChange={(e) => onSubtitleChange(e.target.value)}
          placeholder="Article Subtitle"
          className="text-xl text-gray-600 border-none focus:outline-none focus:ring-0"
        />

        {/* Hero Image Upload */}
        <Card className="p-8 border-2 border-dashed border-gray-300 hover:border-gray-400 transition cursor-pointer">
          <div className="space-y-4 text-center">
            <ImageIcon size={32} className="mx-auto text-gray-400" />
            <div>
              <p className="font-semibold">Upload Cover Image</p>
              <p className="text-sm text-gray-500">JPG or PNG, minimum 1280x720, maximum 5MB</p>
            </div>
            <Input
              type="text"
              value={heroImage || ''}
              onChange={(e) => onHeroImageChange(e.target.value)}
              placeholder="Or paste image URL..."
              className="text-center"
            />
          </div>
        </Card>

        {heroImage && (
          <div className="rounded-lg overflow-hidden">
            <img src={heroImage} alt="Hero" className="w-full h-auto" />
          </div>
        )}
      </div>

      {/* Editor Blocks */}
      <div className="space-y-4">
        {blocks.length === 0 ? (
          <div className="text-center py-12">
            <button
              onClick={() => addBlock('text')}
              className="flex items-center gap-2 mx-auto text-gray-400 hover:text-gray-600 transition"
            >
              <Plus size={20} />
              <span>Start writing...</span>
            </button>
          </div>
        ) : (
          blocks.map((block, index) => (
            <div key={block.id}>
              {renderBlock(block, index)}
              {index === blocks.length - 1 && (
                <button
                  onClick={() => addBlock('text')}
                  className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition mx-auto mt-4"
                >
                  <Plus size={18} className="text-gray-400" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

interface BlockMenuProps {
  position: BlockMenuPosition
  onAddBlock: (type: BlockType) => void
  onClose: () => void
}

const BlockMenu = React.forwardRef<HTMLDivElement, BlockMenuProps>(
  ({ position, onAddBlock, onClose }, ref) => {
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (ref && 'current' in ref && ref.current && !ref.current.contains(e.target as Node)) {
          onClose()
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [onClose, ref])

    const blocks: { type: BlockType; label: string; icon: React.ReactNode }[] = [
      { type: 'text', label: 'Text', icon: <Plus size={16} /> },
      { type: 'heading', label: 'Heading', icon: <Heading1 size={16} /> },
      { type: 'subheading', label: 'Subheading', icon: <Heading2 size={16} /> },
      { type: 'image', label: 'Image', icon: <ImageIcon size={16} /> },
      { type: 'video', label: 'Video', icon: <Video size={16} /> },
      { type: 'quote', label: 'Quote', icon: <Quote size={16} /> },
      { type: 'divider', label: 'Divider', icon: <Minus size={16} /> },
    ]

    return (
      <div
        ref={ref}
        className="absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
        style={{ top: `${position.top}px`, left: `${position.left}px` }}
      >
        {blocks.map((block) => (
          <button
            key={block.type}
            onClick={() => {
              onAddBlock(block.type)
              onClose()
            }}
            className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-50 transition text-left"
          >
            <span className="text-gray-400">{block.icon}</span>
            <span className="text-sm font-medium">{block.label}</span>
          </button>
        ))}
      </div>
    )
  }
)

BlockMenu.displayName = 'BlockMenu'
