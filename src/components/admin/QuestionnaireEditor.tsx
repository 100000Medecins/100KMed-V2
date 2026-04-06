'use client'

import { useState, useRef, useTransition } from 'react'
import { GripVertical, Pencil, Trash2, Plus, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import {
  createSection,
  updateSection,
  deleteSection,
  reorderSections,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
} from '@/lib/actions/questionnaires'
import type { QuestionnaireSection, QuestionnaireQuestion } from '@/lib/actions/questionnaires'

const CRITERES = [
  { value: 'interface', label: 'Interface' },
  { value: 'fonctionnalites', label: 'Fonctionnalités' },
  { value: 'editeur', label: 'Éditeur / Support' },
  { value: 'qualite_prix', label: 'Qualité/Prix' },
  { value: 'fiabilite', label: 'Fiabilité' },
] as const

interface Props {
  categorieSlug: string
  initialSections: QuestionnaireSection[]
  slugLabel: string
}

export default function QuestionnaireEditor({ categorieSlug, initialSections, slugLabel }: Props) {
  const [sections, setSections] = useState(initialSections)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

  // ── Section states ────────────────────────────────────────────────────────
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [editingSection, setEditingSection] = useState({ titre: '', introduction: '' })
  const [showNewSection, setShowNewSection] = useState(false)
  const [newSection, setNewSection] = useState({ titre: '', introduction: '' })

  // ── Question states ───────────────────────────────────────────────────────
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [editingQuestion, setEditingQuestion] = useState({ key: '', question: '', critere_majeur: 'interface' as QuestionnaireQuestion['critere_majeur'] })
  const [newQuestionSectionId, setNewQuestionSectionId] = useState<string | null>(null)
  const [newQuestion, setNewQuestion] = useState({ key: '', question: '', critere_majeur: 'interface' as QuestionnaireQuestion['critere_majeur'] })

  // ── Drag sections ─────────────────────────────────────────────────────────
  const sectionDragRef = useRef<number | null>(null)
  const [sectionDragOver, setSectionDragOver] = useState<number | null>(null)

  // ── Drag questions ────────────────────────────────────────────────────────
  const questionDragRef = useRef<{ sectionId: string; index: number } | null>(null)
  const [questionDragOver, setQuestionDragOver] = useState<{ sectionId: string; index: number } | null>(null)

  // ── Helpers ───────────────────────────────────────────────────────────────
  function toggleCollapse(sectionId: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  // ── Section CRUD ──────────────────────────────────────────────────────────
  function startEditSection(s: QuestionnaireSection) {
    setEditingSectionId(s.id)
    setEditingSection({ titre: s.titre, introduction: s.introduction ?? '' })
  }

  async function confirmEditSection(id: string) {
    if (!editingSection.titre.trim()) return
    setSections((prev) => prev.map((s) => s.id === id ? { ...s, titre: editingSection.titre.trim(), introduction: editingSection.introduction.trim() || null } : s))
    setEditingSectionId(null)
    startTransition(async () => {
      await updateSection(id, editingSection.titre.trim(), editingSection.introduction.trim() || null)
    })
  }

  async function handleDeleteSection(id: string, titre: string) {
    if (!confirm(`Supprimer la section "${titre}" et toutes ses questions ?`)) return
    setSections((prev) => prev.filter((s) => s.id !== id))
    startTransition(async () => { await deleteSection(id) })
  }

  async function handleCreateSection() {
    if (!newSection.titre.trim()) return
    const ordre = sections.length
    startTransition(async () => {
      const result = await createSection(categorieSlug, newSection.titre.trim(), newSection.introduction.trim() || null, ordre)
      if (result?.section) setSections((prev) => [...prev, result.section!])
    })
    setNewSection({ titre: '', introduction: '' })
    setShowNewSection(false)
  }

  // ── Section drag ──────────────────────────────────────────────────────────
  function handleSectionDragStart(index: number) { sectionDragRef.current = index }
  function handleSectionDragOver(e: React.DragEvent, index: number) { e.preventDefault(); setSectionDragOver(index) }
  function handleSectionDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault()
    const dragIndex = sectionDragRef.current
    if (dragIndex === null || dragIndex === dropIndex) { setSectionDragOver(null); return }
    const updated = [...sections]
    const [moved] = updated.splice(dragIndex, 1)
    updated.splice(dropIndex, 0, moved)
    setSections(updated)
    sectionDragRef.current = null
    setSectionDragOver(null)
    startTransition(async () => { await reorderSections(updated.map((s) => s.id)) })
  }
  function handleSectionDragEnd() { sectionDragRef.current = null; setSectionDragOver(null) }

  // ── Question CRUD ─────────────────────────────────────────────────────────
  function startEditQuestion(q: QuestionnaireQuestion) {
    setEditingQuestionId(q.id)
    setEditingQuestion({ key: q.key, question: q.question, critere_majeur: q.critere_majeur })
  }

  async function confirmEditQuestion(sectionId: string, questionId: string) {
    if (!editingQuestion.question.trim() || !editingQuestion.key.trim()) return
    setSections((prev) => prev.map((s) => s.id === sectionId
      ? { ...s, questions: s.questions.map((q) => q.id === questionId ? { ...q, ...editingQuestion } : q) }
      : s
    ))
    setEditingQuestionId(null)
    startTransition(async () => {
      await updateQuestion(questionId, editingQuestion.key.trim(), editingQuestion.question.trim(), editingQuestion.critere_majeur)
    })
  }

  async function handleDeleteQuestion(sectionId: string, questionId: string) {
    if (!confirm('Supprimer cette question ?')) return
    setSections((prev) => prev.map((s) => s.id === sectionId
      ? { ...s, questions: s.questions.filter((q) => q.id !== questionId) }
      : s
    ))
    startTransition(async () => { await deleteQuestion(questionId) })
  }

  async function handleCreateQuestion(sectionId: string) {
    if (!newQuestion.question.trim() || !newQuestion.key.trim()) return
    const section = sections.find((s) => s.id === sectionId)
    const ordre = section?.questions.length ?? 0
    startTransition(async () => {
      const result = await createQuestion(sectionId, newQuestion.key.trim(), newQuestion.question.trim(), newQuestion.critere_majeur, ordre)
      if (result?.question) {
        setSections((prev) => prev.map((s) => s.id === sectionId
          ? { ...s, questions: [...s.questions, result.question!] }
          : s
        ))
      }
    })
    setNewQuestion({ key: '', question: '', critere_majeur: 'interface' })
    setNewQuestionSectionId(null)
  }

  // ── Question drag ─────────────────────────────────────────────────────────
  function handleQuestionDragStart(sectionId: string, index: number) { questionDragRef.current = { sectionId, index } }
  function handleQuestionDragOver(e: React.DragEvent, sectionId: string, index: number) { e.preventDefault(); e.stopPropagation(); setQuestionDragOver({ sectionId, index }) }
  function handleQuestionDrop(e: React.DragEvent, sectionId: string, dropIndex: number) {
    e.preventDefault(); e.stopPropagation()
    const drag = questionDragRef.current
    if (!drag || drag.sectionId !== sectionId || drag.index === dropIndex) { setQuestionDragOver(null); return }
    const section = sections.find((s) => s.id === sectionId)
    if (!section) return
    const updated = [...section.questions]
    const [moved] = updated.splice(drag.index, 1)
    updated.splice(dropIndex, 0, moved)
    setSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, questions: updated } : s))
    questionDragRef.current = null
    setQuestionDragOver(null)
    startTransition(async () => { await reorderQuestions(updated.map((q) => q.id)) })
  }
  function handleQuestionDragEnd() { questionDragRef.current = null; setQuestionDragOver(null) }

  const CRITERE_COLORS: Record<string, string> = {
    interface: 'bg-blue-50 text-blue-600',
    fonctionnalites: 'bg-purple-50 text-purple-600',
    editeur: 'bg-orange-50 text-orange-600',
    qualite_prix: 'bg-green-50 text-green-600',
    fiabilite: 'bg-red-50 text-red-600',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {sections.length} section{sections.length > 1 ? 's' : ''} —{' '}
          {sections.reduce((sum, s) => sum + s.questions.length, 0)} questions au total
        </p>
      </div>

      {/* Sections */}
      {sections.map((section, sIndex) => {
        const isCollapsed = collapsedSections.has(section.id)
        return (
          <div
            key={section.id}
            onDragOver={(e) => handleSectionDragOver(e, sIndex)}
            onDrop={(e) => handleSectionDrop(e, sIndex)}
            onDragEnd={handleSectionDragEnd}
            className={`bg-white rounded-card shadow-card overflow-hidden transition-colors ${sectionDragOver === sIndex ? 'ring-2 ring-accent-blue' : ''}`}
          >
            {/* Header section */}
            <div className="flex items-start gap-3 px-4 py-3 bg-surface-light border-b border-gray-100">
              <div
                draggable
                onDragStart={() => handleSectionDragStart(sIndex)}
                className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 mt-1 flex-shrink-0"
              >
                <GripVertical className="w-4 h-4" />
              </div>

              {editingSectionId === section.id ? (
                <div className="flex-1 space-y-2">
                  <input
                    autoFocus
                    value={editingSection.titre}
                    onChange={(e) => setEditingSection((p) => ({ ...p, titre: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmEditSection(section.id); if (e.key === 'Escape') setEditingSectionId(null) }}
                    placeholder="Titre de la section"
                    className="w-full text-sm font-semibold px-2 py-1 border border-accent-blue/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                  />
                  <input
                    value={editingSection.introduction}
                    onChange={(e) => setEditingSection((p) => ({ ...p, introduction: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmEditSection(section.id); if (e.key === 'Escape') setEditingSectionId(null) }}
                    placeholder="Introduction (optionnelle)"
                    className="w-full text-xs px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => confirmEditSection(section.id)} className="text-green-500 hover:text-green-700"><Check className="w-4 h-4" /></button>
                    <button type="button" onClick={() => setEditingSectionId(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-semibold text-navy cursor-pointer hover:text-accent-blue transition-colors"
                    onClick={() => startEditSection(section)}
                    title="Cliquer pour modifier"
                  >
                    {section.titre}
                  </p>
                  {section.introduction && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{section.introduction}</p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-xs text-gray-400">{section.questions.length}q</span>
                <button
                  type="button"
                  onClick={() => handleDeleteSection(section.id, section.titre)}
                  className="text-gray-300 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleCollapse(section.id)}
                  className="text-gray-400 hover:text-navy transition-colors p-1"
                >
                  {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Questions */}
            {!isCollapsed && (
              <div className="divide-y divide-gray-50">
                {section.questions.map((q, qIndex) => {
                  const isOver = questionDragOver?.sectionId === section.id && questionDragOver.index === qIndex
                  return (
                    <div
                      key={q.id}
                      onDragOver={(e) => handleQuestionDragOver(e, section.id, qIndex)}
                      onDrop={(e) => handleQuestionDrop(e, section.id, qIndex)}
                      onDragEnd={handleQuestionDragEnd}
                      className={`px-4 py-2.5 transition-colors ${isOver ? 'bg-blue-50 ring-1 ring-inset ring-accent-blue/30' : ''}`}
                    >
                      {editingQuestionId === q.id ? (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              value={editingQuestion.key}
                              onChange={(e) => setEditingQuestion((p) => ({ ...p, key: e.target.value }))}
                              placeholder="Clé technique (ex: detail_connexion)"
                              className="w-48 text-xs px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/30 font-mono"
                            />
                            <select
                              value={editingQuestion.critere_majeur}
                              onChange={(e) => setEditingQuestion((p) => ({ ...p, critere_majeur: e.target.value as QuestionnaireQuestion['critere_majeur'] }))}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                            >
                              {CRITERES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                          </div>
                          <textarea
                            autoFocus
                            value={editingQuestion.question}
                            onChange={(e) => setEditingQuestion((p) => ({ ...p, question: e.target.value }))}
                            rows={2}
                            className="w-full text-sm px-2 py-1 border border-accent-blue/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/30 resize-none"
                          />
                          <div className="flex gap-2">
                            <button type="button" onClick={() => confirmEditQuestion(section.id, q.id)} className="text-green-500 hover:text-green-700"><Check className="w-4 h-4" /></button>
                            <button type="button" onClick={() => setEditingQuestionId(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 group">
                          <div
                            draggable
                            onDragStart={() => handleQuestionDragStart(section.id, qIndex)}
                            className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400 flex-shrink-0 mt-0.5"
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>
                          <p
                            className="flex-1 text-sm text-gray-700 cursor-pointer hover:text-accent-blue transition-colors"
                            onClick={() => startEditQuestion(q)}
                          >
                            {q.question}
                          </p>
                          <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${CRITERE_COLORS[q.critere_majeur] ?? ''}`}>
                              {CRITERES.find((c) => c.value === q.critere_majeur)?.label}
                            </span>
                            <span className="text-xs text-gray-300 font-mono">{q.key}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(section.id, q.id)}
                              className="text-gray-300 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Nouvelle question */}
                {newQuestionSectionId === section.id ? (
                  <div className="px-4 py-3 space-y-2 bg-blue-50/40">
                    <div className="flex gap-2">
                      <input
                        value={newQuestion.key}
                        onChange={(e) => setNewQuestion((p) => ({ ...p, key: e.target.value }))}
                        placeholder="Clé technique (ex: detail_connexion)"
                        className="w-56 text-xs px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/30 font-mono"
                      />
                      <select
                        value={newQuestion.critere_majeur}
                        onChange={(e) => setNewQuestion((p) => ({ ...p, critere_majeur: e.target.value as QuestionnaireQuestion['critere_majeur'] }))}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                      >
                        {CRITERES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <textarea
                      autoFocus
                      value={newQuestion.question}
                      onChange={(e) => setNewQuestion((p) => ({ ...p, question: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCreateQuestion(section.id) } if (e.key === 'Escape') setNewQuestionSectionId(null) }}
                      placeholder="Texte de la question…"
                      rows={2}
                      className="w-full text-sm px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/30 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleCreateQuestion(section.id)}
                        className="px-3 py-1 text-xs font-semibold bg-navy text-white rounded-lg hover:bg-navy-dark transition-colors"
                      >
                        Ajouter
                      </button>
                      <button
                        type="button"
                        onClick={() => { setNewQuestionSectionId(null); setNewQuestion({ key: '', question: '', critere_majeur: 'interface' }) }}
                        className="px-3 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => { setNewQuestionSectionId(section.id); setNewQuestion({ key: '', question: '', critere_majeur: 'interface' }) }}
                      className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-accent-blue transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter une question
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Nouvelle section */}
      {showNewSection ? (
        <div className="bg-white rounded-card shadow-card p-4 space-y-2">
          <input
            autoFocus
            value={newSection.titre}
            onChange={(e) => setNewSection((p) => ({ ...p, titre: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateSection(); if (e.key === 'Escape') setShowNewSection(false) }}
            placeholder="Titre de la section…"
            className="w-full text-sm font-semibold px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50"
          />
          <input
            value={newSection.introduction}
            onChange={(e) => setNewSection((p) => ({ ...p, introduction: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateSection(); if (e.key === 'Escape') setShowNewSection(false) }}
            placeholder="Introduction (optionnelle)"
            className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
          />
          <div className="flex gap-2">
            <button type="button" onClick={handleCreateSection} className="px-4 py-2 text-sm font-semibold bg-navy text-white rounded-xl hover:bg-navy-dark transition-colors">
              Créer
            </button>
            <button type="button" onClick={() => { setShowNewSection(false); setNewSection({ titre: '', introduction: '' }) }} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowNewSection(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-accent-blue border border-accent-blue/30 rounded-xl hover:bg-accent-blue/5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Ajouter une section
        </button>
      )}
    </div>
  )
}
