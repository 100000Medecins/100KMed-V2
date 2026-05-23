export const SPECIALITES = [
  'Allergologie',
  'Anatomie et cytologie pathologiques',
  'Anesthésie-réanimation',
  'Biologie médicale',
  'Cardiologie',
  'Chirurgie générale',
  'Chirurgie orthopédique',
  'Dermatologie',
  'Endocrinologie',
  'Gastro-entérologie',
  'Gériatrie',
  'Gynécologie',
  'Hématologie',
  'Infectiologie',
  'Médecine du travail',
  "Médecine d'urgence",
  'Médecine générale',
  'Médecine interne',
  'Médecine légale',
  'Médecine physique',
  'Néphrologie',
  'Neurochirurgie',
  'Neurologie',
  'Oncologie',
  'Ophtalmologie',
  'ORL',
  'Pédiatrie',
  'Pneumologie',
  'Psychiatrie',
  'Radiologie',
  'Rhumatologie',
  'Santé publique',
  'Stomatologie',
  'Urologie',
  'Autre',
]

export const MODES_EXERCICE = [
  'Libéral',
  'Salarié',
  'Mixte',
  'Hospitalier',
  'Remplaçant',
  'Étudiant',
  'Éditeur',
]

/**
 * Correspondance code SM (Pro Santé Connect / DMP) → nom de spécialité.
 * Source : https://smt.esante.gouv.fr/fhir/ValueSet/JDV-J65-SubjectRole-DMP
 */
export const SM_SPECIALITES: Record<string, string> = {
  'SM01': 'Anatomie et Cytologie pathologiques',
  'SM02': 'Anesthésie-réanimation',
  'SM03': 'Biologie médicale',
  'SM04': 'Cardiologie et Maladies vasculaires',
  'SM05': 'Chirurgie générale',
  'SM06': 'Chirurgie maxillo-faciale',
  'SM07': 'Chirurgie maxillo-faciale et Stomatologie',
  'SM08': 'Chirurgie orthopédique et Traumatologie',
  'SM09': 'Chirurgie infantile',
  'SM10': 'Chirurgie plastique reconstructrice et esthétique',
  'SM11': 'Chirurgie thoracique et cardio-vasculaire',
  'SM12': 'Chirurgie urologique',
  'SM13': 'Chirurgie vasculaire',
  'SM14': 'Chirurgie viscérale et digestive',
  'SM15': 'Dermatologie et vénéréologie',
  'SM16': 'Endocrinologie et métabolisme',
  'SM17': 'Génétique médicale',
  'SM18': 'Gériatrie',
  'SM19': 'Gynécologie médicale',
  'SM20': 'Gynécologie-obstétrique',
  'SM21': 'Hématologie',
  'SM22': 'Hématologie, option Maladie du sang',
  'SM23': 'Hématologie, option Onco-hématologie',
  'SM24': 'Gastro-entérologie et Hépatologie',
  'SM25': 'Médecine du travail',
  'SM26': 'Médecin généraliste',
  'SM27': 'Médecine interne',
  'SM28': 'Médecine nucléaire',
  'SM29': 'Médecine physique et réadaptation',
  'SM30': 'Néphrologie',
  'SM31': 'Neuro-chirurgie',
  'SM32': 'Neurologie',
  'SM33': 'Neuro-psychiatrie',
  'SM34': 'ORL et Chirurgie cervico-faciale',
  'SM35': 'Oncologie, option Onco-hématologie',
  'SM36': 'Oncologie, option médicale',
  'SM37': 'Oncologie, option radiothérapie',
  'SM38': 'Ophtalmologie',
  'SM39': 'Oto-rhino-laryngologie',
  'SM40': 'Pédiatrie',
  'SM41': 'Pneumologie',
  'SM42': 'Psychiatrie',
  'SM43': 'Psychiatrie, option enfant et adolescent',
  'SM44': 'Radio-diagnostic',
  'SM45': 'Radio-thérapie',
  'SM46': 'Médecine intensive-réanimation',
  'SM47': 'Recherche médicale',
  'SM48': 'Rhumatologie',
  'SM49': 'Santé publique et Médecine sociale',
  'SM50': 'Stomatologie',
  'SM51': 'Gynéco-obstétrique et Gynéco-médicale, option Gynéco-obstétrique',
  'SM52': 'Gynéco-obstétrique et Gynéco-médicale, option Gynéco-médicale',
  'SM53': 'Médecin généraliste',
  'SM54': 'Médecin généraliste',
  'SM55': 'Radio-diagnostic et Radio-thérapie',
  'SM56': 'Chirurgie orale',
  'SM57': 'Allergologie',
  'SM58': 'Maladies infectieuses et tropicales',
  'SM59': "Médecine d'urgence",
  'SM60': 'Médecine légale et expertises médicales',
  'SM61': 'Médecine vasculaire',
  'SM62': 'Endocrinologie, diabétologie, nutrition',
  'SM63': 'Biologie médicale option biologie générale',
  'SM64': 'Biologie médicale option médecine moléculaire, génétique et pharmacologie',
  'SM65': 'Biologie médicale option hématologie et immunologie',
  'SM66': 'Biologie médicale option agents infectieux',
  'SM67': 'Biologie médicale option biologie de la reproduction',
  'SM68': 'Chirurgie maxillo-faciale (réforme 2017)',
  'SM69': 'Chirurgie pédiatrique option chirurgie viscérale pédiatrique',
  'SM70': 'Chirurgie pédiatrique option orthopédie pédiatrique',
  'SM71': 'Hématologie (réforme 2017)',
  'SM72': 'Médecine interne et immunologie clinique',
  'SM73': 'Médecine cardiovasculaire',
  'SM74': 'Radiologie et imagerie médicale',
  'SM75': 'Santé publique',
  'SM76': 'Anesthésie-réanimation option anesthésie-pédiatrique',
  'SM77': 'Chirurgie maxillo-faciale option orthodontie des dysmorphies maxillo-faciales',
  'SM78': 'Chirurgie viscérale et digestive option endoscopie chirurgicale',
  'SM79': 'Médecine cardiovasculaire option cardiologie interventionnelle',
  'SM80': "Médecine cardiovasculaire option imagerie cardio d'expert",
  'SM81': 'Médecine cardiovasculaire option rythmologie interventionnelle et stimulation cardiaque',
  'SM82': 'Médecine intensive-réanimation option réanimation pédiatrique',
  'SM83': 'Néphrologie option soins intensifs néphrologiques',
  'SM84': "Neurologie option traitement interventionnel de l'ischémie cérébrale aigüe",
  'SM85': 'Ophtalmologie option chirurgie ophtalmopédiatrique et strabologique',
  'SM86': 'ORL et chirurgie cervico-faciale option audiophonologie',
  'SM87': 'Pédiatrie option néonatologie',
  'SM88': 'Pédiatrie option neuropédiatrie',
  'SM89': 'Pédiatrie option pneumopédiatrie',
  'SM90': 'Pédiatrie option réanimation pédiatrique',
  'SM91': 'Pneumologie option soins intensifs respiratoires',
  'SM92': 'Psychiatrie option enfant et adolescent',
  'SM93': 'Psychiatrie option psychiatrie personne âgée',
  'SM94': 'Radiologie imagerie médicale option radiologie interventionnelle avancée',
  'SM95': 'Santé publique option administration de la santé',
}

/**
 * Résout un code de spécialité SM (ex: "SM 40", "SM40") en nom lisible.
 * Retourne la valeur originale si le code n'est pas trouvé.
 */
export function resolveSpecialite(value: string | null): string | null {
  if (!value) return null
  const normalized = value.replace(/\s+/g, '').toUpperCase()
  return SM_SPECIALITES[normalized] ?? value
}

/**
 * Correspondance libellé PSC (valeurs de SM_SPECIALITES) → libellé de la liste
 * admin SPECIALITES. PSC et le sélecteur admin utilisent deux référentiels de
 * libellés distincts ; ce mapping permet de comparer une spécialité d'utilisateur
 * (issue de PSC) à une spécialité ciblée (saisie via SPECIALITES).
 *
 * Toute valeur PSC absente de ce mapping est rapprochée par défaut de "Autre".
 */
const PSC_TO_SPECIALITE: Record<string, string> = {
  'Allergologie': 'Allergologie',
  'Anatomie et Cytologie pathologiques': 'Anatomie et cytologie pathologiques',
  'Anesthésie-réanimation': 'Anesthésie-réanimation',
  'Anesthésie-réanimation option anesthésie-pédiatrique': 'Anesthésie-réanimation',
  'Médecine intensive-réanimation': 'Anesthésie-réanimation',
  'Médecine intensive-réanimation option réanimation pédiatrique': 'Anesthésie-réanimation',
  'Biologie médicale': 'Biologie médicale',
  'Biologie médicale option biologie générale': 'Biologie médicale',
  'Biologie médicale option médecine moléculaire, génétique et pharmacologie': 'Biologie médicale',
  'Biologie médicale option hématologie et immunologie': 'Biologie médicale',
  'Biologie médicale option agents infectieux': 'Biologie médicale',
  'Biologie médicale option biologie de la reproduction': 'Biologie médicale',
  'Cardiologie et Maladies vasculaires': 'Cardiologie',
  'Médecine cardiovasculaire': 'Cardiologie',
  'Médecine cardiovasculaire option cardiologie interventionnelle': 'Cardiologie',
  "Médecine cardiovasculaire option imagerie cardio d'expert": 'Cardiologie',
  'Médecine cardiovasculaire option rythmologie interventionnelle et stimulation cardiaque': 'Cardiologie',
  'Médecine vasculaire': 'Cardiologie',
  'Chirurgie générale': 'Chirurgie générale',
  'Chirurgie maxillo-faciale': 'Chirurgie générale',
  'Chirurgie maxillo-faciale et Stomatologie': 'Chirurgie générale',
  'Chirurgie maxillo-faciale (réforme 2017)': 'Chirurgie générale',
  'Chirurgie maxillo-faciale option orthodontie des dysmorphies maxillo-faciales': 'Chirurgie générale',
  'Chirurgie infantile': 'Chirurgie générale',
  'Chirurgie plastique reconstructrice et esthétique': 'Chirurgie générale',
  'Chirurgie thoracique et cardio-vasculaire': 'Chirurgie générale',
  'Chirurgie vasculaire': 'Chirurgie générale',
  'Chirurgie viscérale et digestive': 'Chirurgie générale',
  'Chirurgie viscérale et digestive option endoscopie chirurgicale': 'Chirurgie générale',
  'Chirurgie orale': 'Chirurgie générale',
  'Chirurgie pédiatrique option chirurgie viscérale pédiatrique': 'Chirurgie générale',
  'Chirurgie orthopédique et Traumatologie': 'Chirurgie orthopédique',
  'Chirurgie pédiatrique option orthopédie pédiatrique': 'Chirurgie orthopédique',
  'Chirurgie urologique': 'Urologie',
  'Dermatologie et vénéréologie': 'Dermatologie',
  'Endocrinologie et métabolisme': 'Endocrinologie',
  'Endocrinologie, diabétologie, nutrition': 'Endocrinologie',
  'Gastro-entérologie et Hépatologie': 'Gastro-entérologie',
  'Gériatrie': 'Gériatrie',
  'Gynécologie médicale': 'Gynécologie',
  'Gynécologie-obstétrique': 'Gynécologie',
  'Gynéco-obstétrique et Gynéco-médicale, option Gynéco-obstétrique': 'Gynécologie',
  'Gynéco-obstétrique et Gynéco-médicale, option Gynéco-médicale': 'Gynécologie',
  'Hématologie': 'Hématologie',
  'Hématologie, option Maladie du sang': 'Hématologie',
  'Hématologie, option Onco-hématologie': 'Hématologie',
  'Hématologie (réforme 2017)': 'Hématologie',
  'Maladies infectieuses et tropicales': 'Infectiologie',
  'Médecine du travail': 'Médecine du travail',
  "Médecine d'urgence": "Médecine d'urgence",
  'Médecin généraliste': 'Médecine générale',
  'Médecine interne': 'Médecine interne',
  'Médecine interne et immunologie clinique': 'Médecine interne',
  'Médecine légale et expertises médicales': 'Médecine légale',
  'Médecine physique et réadaptation': 'Médecine physique',
  'Néphrologie': 'Néphrologie',
  'Néphrologie option soins intensifs néphrologiques': 'Néphrologie',
  'Neuro-chirurgie': 'Neurochirurgie',
  'Neurologie': 'Neurologie',
  "Neurologie option traitement interventionnel de l'ischémie cérébrale aigüe": 'Neurologie',
  'Neuro-psychiatrie': 'Psychiatrie',
  'ORL et Chirurgie cervico-faciale': 'ORL',
  'ORL et chirurgie cervico-faciale option audiophonologie': 'ORL',
  'Oto-rhino-laryngologie': 'ORL',
  'Oncologie, option Onco-hématologie': 'Oncologie',
  'Oncologie, option médicale': 'Oncologie',
  'Oncologie, option radiothérapie': 'Oncologie',
  'Ophtalmologie': 'Ophtalmologie',
  'Ophtalmologie option chirurgie ophtalmopédiatrique et strabologique': 'Ophtalmologie',
  'Pédiatrie': 'Pédiatrie',
  'Pédiatrie option néonatologie': 'Pédiatrie',
  'Pédiatrie option neuropédiatrie': 'Pédiatrie',
  'Pédiatrie option pneumopédiatrie': 'Pédiatrie',
  'Pédiatrie option réanimation pédiatrique': 'Pédiatrie',
  'Pneumologie': 'Pneumologie',
  'Pneumologie option soins intensifs respiratoires': 'Pneumologie',
  'Psychiatrie': 'Psychiatrie',
  'Psychiatrie, option enfant et adolescent': 'Psychiatrie',
  'Psychiatrie option enfant et adolescent': 'Psychiatrie',
  'Psychiatrie option psychiatrie personne âgée': 'Psychiatrie',
  'Radio-diagnostic': 'Radiologie',
  'Radio-thérapie': 'Radiologie',
  'Radio-diagnostic et Radio-thérapie': 'Radiologie',
  'Radiologie et imagerie médicale': 'Radiologie',
  'Radiologie imagerie médicale option radiologie interventionnelle avancée': 'Radiologie',
  'Médecine nucléaire': 'Radiologie',
  'Rhumatologie': 'Rhumatologie',
  'Santé publique': 'Santé publique',
  'Santé publique et Médecine sociale': 'Santé publique',
  'Santé publique option administration de la santé': 'Santé publique',
  'Stomatologie': 'Stomatologie',
  'Génétique médicale': 'Autre',
  'Recherche médicale': 'Autre',
}

/**
 * Ramène une spécialité d'utilisateur au libellé de la liste admin SPECIALITES.
 * Accepte aussi bien un libellé déjà au format admin (renvoyé tel quel) qu'un
 * libellé PSC (mappé via PSC_TO_SPECIALITE).
 */
export function normaliserSpecialite(value: string | null | undefined): string | null {
  if (!value) return null
  if ((SPECIALITES as readonly string[]).includes(value)) return value
  return PSC_TO_SPECIALITE[value] ?? value
}

/**
 * Indique si une spécialité d'utilisateur correspond à une liste de spécialités
 * ciblées. Une liste de cibles vide signifie « toutes les spécialités ».
 * La comparaison passe par normaliserSpecialite() pour réconcilier les libellés
 * PSC et ceux de la liste admin.
 */
export function specialiteConcernee(
  userSpecialite: string | null | undefined,
  specialitesCibles: string[],
): boolean {
  if (!specialitesCibles || specialitesCibles.length === 0) return true
  if (!userSpecialite) return true
  const user = normaliserSpecialite(userSpecialite)
  return specialitesCibles.some((c) => normaliserSpecialite(c) === user)
}

export const AVATARS = Array.from({ length: 48 }, (_, i) => ({
  id: `avatar-${i + 1}`,
  url: `/images/portraits/avatar-${i + 1}.png`,
}))
