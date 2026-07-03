import { MessageCircle, MessageSquare, Hash, Facebook, Globe } from 'lucide-react'

/**
 * Métadonnées d'affichage par type de communauté (icône, libellé, couleurs).
 * Partagé entre la carte de la fiche solution (`SolutionCommunautesCard`)
 * et le bloc agrégé de la page éditeur (`EditeurCommunautes`).
 */
export const COMMUNAUTE_TYPE_META: Record<
  string,
  { label: string; Icon: typeof MessageCircle; color: string }
> = {
  whatsapp: { label: 'WhatsApp', Icon: MessageCircle, color: 'text-green-600 bg-green-50' },
  telegram: { label: 'Telegram', Icon: MessageSquare, color: 'text-sky-600 bg-sky-50' },
  discord: { label: 'Discord', Icon: Hash, color: 'text-indigo-600 bg-indigo-50' },
  facebook: { label: 'Facebook', Icon: Facebook, color: 'text-blue-600 bg-blue-50' },
  forum: { label: 'Forum', Icon: Globe, color: 'text-amber-600 bg-amber-50' },
  autre: { label: 'Autre', Icon: Globe, color: 'text-gray-600 bg-gray-50' },
}
