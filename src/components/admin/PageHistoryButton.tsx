'use client'

import { useState } from 'react'
import { History } from 'lucide-react'
import PageHistoryModal, {
  type HistoryEntry,
} from '@/components/admin/PageHistoryModal'

interface PageHistoryButtonProps {
  pageId: string
  history: HistoryEntry[]
}

export default function PageHistoryButton({
  pageId,
  history,
}: PageHistoryButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
        title="Voir les versions précédentes de cette page"
      >
        <History className="w-3.5 h-3.5" />
        Historique
        {history.length > 0 && (
          <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold">
            {history.length}
          </span>
        )}
      </button>
      {open && (
        <PageHistoryModal
          pageId={pageId}
          history={history}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
