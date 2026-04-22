/**
 * Table de correspondance codes PSC (TRE-R38) → libellés français.
 * Source : https://ansforge.github.io/IG-terminologie-de-sante/ig/main/CodeSystem-TRE-R38-SpecialiteOrdinale.html
 * Uniquement les codes préfixés SM (spécialités médicales ordinales).
 */
export const PSC_SPECIALITES: Record<string, string> = {
  SM01: 'Anatomie et Cytologie pathologiques',
  SM02: 'Anesthésie-réanimation',
  SM03: 'Biologie médicale',
  SM04: 'Cardiologie et Maladies vasculaires',
  SM05: 'Chirurgie générale',
  SM06: 'Chirurgie maxillo-faciale',
  SM07: 'Chirurgie maxillo-faciale et Stomatologie',
  SM08: 'Chirurgie orthopédique et Traumatologie',
  SM09: 'Chirurgie infantile',
  SM10: 'Chirurgie plastique reconstructrice et esthétique',
  SM11: 'Chirurgie thoracique et cardio-vasculaire',
  SM12: 'Chirurgie urologique',
  SM13: 'Chirurgie vasculaire',
  SM14: 'Chirurgie viscérale et digestive',
  SM15: 'Dermatologie et Vénéréologie',
  SM16: 'Endocrinologie et Métabolisme',
  SM17: 'Génétique médicale',
  SM18: 'Gériatrie',
  SM19: 'Gynécologie médicale',
  SM20: 'Gynécologie-obstétrique',
  SM21: 'Hématologie',
  SM22: 'Hématologie, option Maladie du sang',
  SM23: 'Hématologie, option Onco-hématologie',
  SM24: 'Gastro-entérologie et Hépatologie',
  SM25: 'Médecine du travail',
  SM26: 'Médecine générale',
  SM27: 'Médecine interne',
  SM28: 'Médecine nucléaire',
  SM29: 'Médecine physique et de réadaptation',
  SM30: 'Néphrologie',
  SM31: 'Neuro-chirurgie',
  SM32: 'Neurologie',
  SM33: 'Neuro-psychiatrie',
  SM34: 'ORL et Chirurgie cervico-faciale',
  SM35: 'Oncologie, option Onco-hématologie',
  SM36: 'Oncologie, option médicale',
  SM37: 'Oncologie, option radiothérapie',
  SM38: 'Ophtalmologie',
  SM39: 'Oto-rhino-laryngologie',
  SM40: 'Pédiatrie',
  SM41: 'Pneumologie',
  SM42: 'Psychiatrie',
  SM43: 'Psychiatrie, option enfant et adolescent',
  SM44: 'Radio-diagnostic',
  SM45: 'Radio-thérapie',
  SM46: 'Médecine intensive-réanimation',
  SM47: 'Recherche médicale',
  SM48: 'Rhumatologie',
  SM49: 'Santé publique et Médecine sociale',
  SM50: 'Stomatologie',
  SM51: 'Gynéco-obstétrique et Gynéco-médicale, option Gynéco-obstétrique',
  SM52: 'Gynéco-obstétrique et Gynéco-médicale, option Gynéco-médicale',
  SM53: 'Spécialiste en Médecine générale',
  SM54: 'Médecine générale',
  SM55: 'Radio-diagnostic et Radio-thérapie',
  SM56: 'Chirurgie orale',
  SM57: 'Allergologie',
  SM58: 'Maladies infectieuses et tropicales',
  SM59: 'Médecine d\'urgence',
  SM60: 'Médecine légale et expertises médicales',
  SM61: 'Médecine vasculaire',
  SM62: 'Endocrinologie, diabétologie, nutrition',
  SM63: 'Biologie médicale option biologie générale',
  SM64: 'Biologie médicale option médecine moléculaire, génétique et pharmacologie',
  SM65: 'Biologie médicale option hématologie et immunologie',
  SM66: 'Biologie médicale option agents infectieux',
  SM67: 'Biologie médicale option biologie de la reproduction',
  SM68: 'Chirurgie maxillo-faciale (réforme 2017)',
  SM69: 'Chirurgie pédiatrique option chirurgie viscérale pédiatrique',
  SM70: 'Chirurgie pédiatrique option orthopédie pédiatrique',
  SM71: 'Hématologie (réforme 2017)',
  SM72: 'Médecine interne et immunologie clinique',
  SM73: 'Médecine cardiovasculaire',
  SM74: 'Radiologie imagerie médicale',
  SM75: 'Santé publique',
  SM76: 'Anesthésie-réanimation opt anesthésie-pédiatrique',
  SM77: 'Chirurgie maxillo-faciale opt orthod dysmo max-fac',
  SM78: 'Chirurgie viscérale et digestive opt endo chir',
  SM79: 'Médecine cardiovasculaire opt card interventionnelle',
  SM80: 'Médecine cardiovasculaire opt imagerie cardio d\'expert',
  SM81: 'Médecine cardiovasculaire opt rythmo inter stimu card',
  SM82: 'Médecine intensive-réanimation opt réa pédiatrique',
  SM83: 'Néphrologie option soins intensifs néphrologiques',
  SM84: 'Neurologie opt trait interv ischémie céréb aigüe',
  SM85: 'Ophtalmologie opt chir ophtalmopéd strabologique',
  SM86: 'ORL - chir cervico-faciale opt audiophonologie',
  SM87: 'Pédiatrie option néonatologie',
  SM88: 'Pédiatrie option neuropédiatrie',
  SM89: 'Pédiatrie option pneumopédiatrie',
  SM90: 'Pédiatrie option réanimation pédiatrique',
  SM91: 'Pneumologie option soins intensifs respiratoires',
  SM92: 'Psychiatrie option enfant et adolescent',
  SM93: 'Psychiatrie option psychiatrie de la personne âgée',
  SM94: 'Radiologie et imagerie médicale opt radio inter av',
  SM95: 'Santé publique option administration de la santé',
}

/**
 * Codes PSC pour le mode d'exercice.
 */
export const PSC_MODE_EXERCICE: Record<string, string> = {
  L: 'Libéral',
  S: 'Salarié',
  B: 'Bénévole',
}

/**
 * Résout un code spécialité PSC en libellé lisible.
 * Retourne le code tel quel si inconnu.
 */
export function resolveSpecialite(code: string | null | undefined): string | null {
  if (!code) return null
  return PSC_SPECIALITES[code] ?? code
}

/**
 * Extrait le code spécialité depuis SubjectRefPro.
 */
export function extractSpecialiteCode(userInfo: Record<string, unknown>): string | null {
  const ref = userInfo.SubjectRefPro as { exercices?: Array<{ codeSavoirFaire?: string; codeTypeSavoirFaire?: string }> } | undefined
  const exercice = ref?.exercices?.[0]
  if (!exercice) return null
  // On ne prend que les codes de type S (spécialité)
  if (exercice.codeTypeSavoirFaire !== 'S') return null
  return exercice.codeSavoirFaire ?? null
}

/**
 * Extrait le mode d'exercice depuis SubjectRefPro.
 */
export function extractModeExercice(userInfo: Record<string, unknown>): string | null {
  const ref = userInfo.SubjectRefPro as { exercices?: Array<{ activities?: Array<{ codeModeExercice?: string }> }> } | undefined
  const code = ref?.exercices?.[0]?.activities?.[0]?.codeModeExercice
  return PSC_MODE_EXERCICE[code ?? ''] ?? null
}
