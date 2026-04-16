'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Image } from '@tiptap/extension-image'
import { useState, useRef } from 'react'
import { Loader2 } from 'lucide-react'

interface Props {
  initialContent: string
  onChange: (html: string) => void
  minHeight?: number
}

function ToolbarButton({
  onClick,
  active,
  title,
  disabled,
  children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${
        active ? 'bg-navy text-white' : 'text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-gray-300 mx-1 self-center" />
}

export default function RichTextEditorLight({ initialContent, onChange, minHeight = 200 }: Props) {
  const [showTableBar, setShowTableBar] = useState(false)
  const [tableRows, setTableRows] = useState('3')
  const [tableCols, setTableCols] = useState('3')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false }),
      Underline,
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      Image.configure({ HTMLAttributes: { class: 'max-w-full rounded-lg my-2' } }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'rich-editor focus:outline-none px-4 py-3',
        style: `min-height: ${minHeight}px`,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  if (!editor) return null
  const ed = editor

  function applyTable() {
    const rows = Math.max(1, parseInt(tableRows) || 3)
    const cols = Math.max(1, parseInt(tableCols) || 3)
    ed.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
    setShowTableBar(false)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok) { setUploadError(json.error ?? "Erreur lors de l'upload"); return }
      ed.chain().focus().setImage({ src: json.url }).run()
    } catch {
      setUploadError('Erreur réseau lors de l\'upload')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <>
      <style>{`
        .rich-editor { font-size: 0.875rem; color: #374151; line-height: 1.7; }
        .rich-editor p { margin: 0.5rem 0; }
        .rich-editor ul { list-style: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
        .rich-editor ol { list-style: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
        .rich-editor li { margin: 0.25rem 0; }
        .rich-editor strong { font-weight: 700; }
        .rich-editor em { font-style: italic; }
        .rich-editor u { text-decoration: underline; }
        .rich-editor s { text-decoration: line-through; }
        .rich-editor table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
        .rich-editor td, .rich-editor th { border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: left; }
        .rich-editor th { background: #f9fafb; font-weight: 600; color: #1B2A4A; }
        .rich-editor .selectedCell { background: #eff6ff; }
      `}</style>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-gray-200 bg-gray-50">
          <ToolbarButton onClick={() => ed.chain().focus().toggleBold().run()} active={ed.isActive('bold')} title="Gras">
            <strong>G</strong>
          </ToolbarButton>
          <ToolbarButton onClick={() => ed.chain().focus().toggleItalic().run()} active={ed.isActive('italic')} title="Italique">
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton onClick={() => ed.chain().focus().toggleUnderline().run()} active={ed.isActive('underline')} title="Souligné">
            <span style={{ textDecoration: 'underline' }}>S</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => ed.chain().focus().toggleStrike().run()} active={ed.isActive('strike')} title="Barré">
            <span style={{ textDecoration: 'line-through' }}>B</span>
          </ToolbarButton>

          <Divider />

          <ToolbarButton onClick={() => ed.chain().focus().toggleBulletList().run()} active={ed.isActive('bulletList')} title="Liste à puces">• Liste</ToolbarButton>
          <ToolbarButton onClick={() => ed.chain().focus().toggleOrderedList().run()} active={ed.isActive('orderedList')} title="Liste numérotée">1. Liste</ToolbarButton>

          <Divider />

          <ToolbarButton onClick={() => setShowTableBar(true)} title="Insérer un tableau">⊞ Tableau</ToolbarButton>

          <ToolbarButton
            onClick={() => fileInputRef.current?.click()}
            title="Insérer une image"
            disabled={uploading}
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : '🖼'} Image
          </ToolbarButton>
        </div>

        {/* Barre tableau */}
        {showTableBar && (
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-blue-50">
            <span className="text-xs text-gray-500 whitespace-nowrap">Tableau :</span>
            <label className="text-xs text-gray-500">Lignes</label>
            <input type="number" min={1} max={20} value={tableRows} onChange={(e) => setTableRows(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyTable() } if (e.key === 'Escape') setShowTableBar(false) }}
              className="w-16 text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none" />
            <label className="text-xs text-gray-500">Colonnes</label>
            <input type="number" min={1} max={20} value={tableCols} onChange={(e) => setTableCols(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyTable() } if (e.key === 'Escape') setShowTableBar(false) }}
              className="w-16 text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none" />
            <button type="button" onClick={applyTable}
              className="px-3 py-1.5 bg-navy text-white text-xs font-medium rounded-lg hover:bg-navy-dark">
              Insérer
            </button>
            <button type="button" onClick={() => setShowTableBar(false)}
              className="px-3 py-1.5 bg-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-300">
              Annuler
            </button>
          </div>
        )}

        {uploadError && (
          <div className="px-4 py-2 bg-red-50 text-red-600 text-xs border-b border-red-100">{uploadError}</div>
        )}

        <EditorContent editor={editor} />
      </div>
    </>
  )
}
