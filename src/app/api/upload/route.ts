import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import sharp from 'sharp'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
const MAX_SIZE = 5 * 1024 * 1024 // 5 Mo

// Recompressés en WebP à l'upload pour limiter l'egress Storage. Les GIF (logos animés
// email) et SVG (vectoriel) passent tels quels — sharp les casserait ou n'y gagnerait rien.
const RASTER_TO_WEBP = ['image/jpeg', 'image/png', 'image/webp']
const TARGET_MAX_WIDTH = 1600 // px — largeur d'affichage max (retina) des galeries/illustrations
const WEBP_QUALITY = 80
const CACHE_CONTROL = '31536000' // 1 an — le nom de fichier est unique/immuable

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Type de fichier non autorisé (JPEG, PNG, GIF, WebP, SVG uniquement)' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Fichier trop volumineux (5 Mo maximum)' }, { status: 400 })
  }

  // Recompression WebP pour les rasters ; GIF/SVG conservés à l'identique.
  let body: Buffer | File = file
  let contentType = file.type
  let ext = file.name.split('.').pop()

  if (RASTER_TO_WEBP.includes(file.type)) {
    try {
      body = await sharp(Buffer.from(await file.arrayBuffer()))
        .rotate() // applique l'orientation EXIF avant de perdre les métadonnées
        .resize(TARGET_MAX_WIDTH, null, { withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer()
      contentType = 'image/webp'
      ext = 'webp'
    } catch {
      // En cas d'échec sharp (fichier corrompu, format exotique), on retombe sur l'original.
      body = file
      contentType = file.type
    }
  }

  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const supabase = createServiceRoleClient()

  const { error } = await supabase.storage
    .from('images')
    .upload(fileName, body, {
      contentType,
      upsert: false,
      cacheControl: CACHE_CONTROL,
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data } = supabase.storage.from('images').getPublicUrl(fileName)

  return NextResponse.json({ url: data.publicUrl })
}
