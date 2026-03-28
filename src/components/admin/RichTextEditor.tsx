'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Image } from '@tiptap/extension-image'
import { useState, useRef } from 'react'

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

export default function RichTextEditor({ initialContent, onChange, minHeight = 400 }: Props) {
  const [showLinkBar, setShowLinkBar] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [showTableBar, setShowTableBar] = useState(false)
  const [tableRows, setTableRows] = useState('3')
  const [tableCols, setTableCols] = useState('3')
  const [showHtmlSource, setShowHtmlSource] = useState(false)
  const [htmlSource, setHtmlSource] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-accent-blue underline cursor-pointer' } }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      Image.configure({ HTMLAttributes: { class: 'max-w-full rounded-lg my-2' } }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'rich-editor focus:outline-none px-5 py-4',
        style: `min-height: ${minHeight}px`,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  if (!editor) return null
  const ed = editor

  // ── Lien ──────────────────────────────────────────────
  function handleLinkButton() {
    if (ed.isActive('link')) {
      ed.chain().focus().unsetLink().run()
      setShowLinkBar(false)
      return
    }
    setLinkUrl('')
    setShowLinkBar(true)
  }

  function applyLink() {
    if (!linkUrl) return
    const href = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`
    ed.chain().focus().setLink({ href }).run()
    setLinkUrl('')
    setShowLinkBar(false)
  }

  // ── Tableau ────────────────────────────────────────────
  function handleTableButton() {
    setShowTableBar(true)
  }

  function applyTable() {
    const rows = Math.max(1, parseInt(tableRows) || 3)
    const cols = Math.max(1, parseInt(tableCols) || 3)
    ed.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
    setShowTableBar(false)
  }

  // ── HTML source ────────────────────────────────────────
  function toggleHtmlSource() {
    if (!showHtmlSource) {
      setHtmlSource(ed.getHTML())
    } else {
      ed.commands.setContent(htmlSource, true)
    }
    setShowHtmlSource(s => !s)
  }

  function applyHtmlSource() {
    ed.commands.setContent(htmlSource, true)
    setShowHtmlSource(false)
  }

  // ── Image upload ───────────────────────────────────────
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

      if (!res.ok) {
        setUploadError(json.error ?? 'Erreur lors de l\'upload')
        return
      }

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
        .rich-editor h1 { font-size: 1.5rem; font-weight: 700; color: #1B2A4A; margin: 1.25rem 0 0.5rem; }
        .rich-editor h2 { font-size: 1.125rem; font-weight: 700; color: #1B2A4A; margin: 1.25rem 0 0.5rem; }
        .rich-editor h3 { font-size: 1rem; font-weight: 600; color: #1B2A4A; margin: 1rem 0 0.4rem; }
        .rich-editor p { margin: 0.5rem 0; }
        .rich-editor ul { list-style: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
        .rich-editor ol { list-style: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
        .rich-editor li { margin: 0.25rem 0; }
        .rich-editor strong { font-weight: 700; }
        .rich-editor em { font-style: italic; }
        .rich-editor u { text-decoration: underline; }
        .rich-editor s { text-decoration: line-through; }
        .rich-editor blockquote { border-left: 3px solid #e5e7eb; padding-left: 1rem; color: #6b7280; margin: 0.75rem 0; }
        .rich-editor table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
        .rich-editor td, .rich-editor th { border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: left; }
        .rich-editor th { background: #f9fafb; font-weight: 600; color: #1B2A4A; }
        .rich-editor .selectedCell { background: #eff6ff; }
      `}</style>

      {/* Input fichier caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">

        {/* Barre d'outils principale */}
        <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-gray-200 bg-gray-50">

          {/* Formatage texte */}
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

          {/* Titres */}
          <ToolbarButton onClick={() => ed.chain().focus().toggleHeading({ level: 1 }).run()} active={ed.isActive('heading', { level: 1 })} title="Titre H1">H1</ToolbarButton>
          <ToolbarButton onClick={() => ed.chain().focus().toggleHeading({ level: 2 }).run()} active={ed.isActive('heading', { level: 2 })} title="Titre H2">H2</ToolbarButton>
          <ToolbarButton onClick={() => ed.chain().focus().toggleHeading({ level: 3 }).run()} active={ed.isActive('heading', { level: 3 })} title="Titre H3">H3</ToolbarButton>

          <Divider />

          {/* Listes */}
          <ToolbarButton onClick={() => ed.chain().focus().toggleBulletList().run()} active={ed.isActive('bulletList')} title="Liste à puces">• Liste</ToolbarButton>
          <ToolbarButton onClick={() => ed.chain().focus().toggleOrderedList().run()} active={ed.isActive('orderedList')} title="Liste numérotée">1. Liste</ToolbarButton>

          <Divider />

          {/* Lien */}
          <ToolbarButton onClick={handleLinkButton} active={ed.isActive('link')} title={ed.isActive('link') ? 'Supprimer le lien' : 'Insérer un lien'}>
            🔗 {ed.isActive('link') ? 'Supprimer lien' : 'Lien'}
          </ToolbarButton>

          {/* Tableau */}
          <ToolbarButton onClick={handleTableButton} title="Insérer un tableau">⊞ Tableau</ToolbarButton>

          {/* HTML source */}
          <ToolbarButton onClick={toggleHtmlSource} active={showHtmlSource} title="Voir/modifier le HTML source">
            {'</>'} HTML
          </ToolbarButton>

          {/* Image */}
          <ToolbarButton
            onClick={() => fileInputRef.current?.click()}
            title="Insérer une image"
            disabled={uploading}
          >
            {uploading ? '⏳ Upload...' : '🖼 Image'}
          </ToolbarButton>
        </div>

        {/* Barre d'insertion de lien */}
        {showLinkBar && (
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-blue-50">
            <span className="text-xs text-gray-500 whitespace-nowrap">URL du lien :</span>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyLink() } if (e.key === 'Escape') setShowLinkBar(false) }}
              placeholder="https://..."
              autoFocus
              className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
            />
            <button
              type="button"
              onClick={applyLink}
              className="px-3 py-1.5 bg-navy text-white text-xs font-medium rounded-lg hover:bg-navy-dark"
            >
              Confirmer
            </button>
            <button
              type="button"
              onClick={() => setShowLinkBar(false)}
              className="px-3 py-1.5 bg-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-300"
            >
              Annuler
            </button>
          </div>
        )}

        {/* Barre d'insertion de tableau */}
        {showTableBar && (
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-blue-50">
            <span className="text-xs text-gray-500 whitespace-nowrap">Tableau :</span>
            <label className="text-xs text-gray-500">Lignes</label>
            <input
              type="number"
              min={1}
              max={20}
              value={tableRows}
              onChange={(e) => setTableRows(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyTable() } if (e.key === 'Escape') setShowTableBar(false) }}
              className="w-16 text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
            />
            <label className="text-xs text-gray-500">Colonnes</label>
            <input
              type="number"
              min={1}
              max={20}
              value={tableCols}
              onChange={(e) => setTableCols(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyTable() } if (e.key === 'Escape') setShowTableBar(false) }}
              className="w-16 text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
            />
            <button
              type="button"
              onClick={applyTable}
              className="px-3 py-1.5 bg-navy text-white text-xs font-medium rounded-lg hover:bg-navy-dark"
            >
              Insérer
            </button>
            <button
              type="button"
              onClick={() => setShowTableBar(false)}
              className="px-3 py-1.5 bg-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-300"
            >
              Annuler
            </button>
          </div>
        )}

        {/* Erreur upload */}
        {uploadError && (
          <div className="px-4 py-2 bg-red-50 text-red-600 text-xs border-b border-red-100">
            {uploadError}
          </div>
        )}

        {/* Zone d'édition */}
        {showHtmlSource ? (
          <div className="px-3 py-3">
            <textarea
              value={htmlSource}
              onChange={(e) => setHtmlSource(e.target.value)}
              style={{ minHeight: `${minHeight}px` }}
              className="w-full font-mono text-xs text-gray-700 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 resize-y"
              spellCheck={false}
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={applyHtmlSource}
                className="px-3 py-1.5 bg-navy text-white text-xs font-medium rounded-lg hover:bg-navy-dark"
              >
                Appliquer
              </button>
              <button
                type="button"
                onClick={() => setShowHtmlSource(false)}
                className="px-3 py-1.5 bg-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-300"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>
    </>
  )
}
