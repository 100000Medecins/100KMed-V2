/**
 * Génère l'image de partage Open Graph du site (1200x630) à la charte.
 * Fond hero signature (repris de brand-templates/gen-backgrounds.js) + logo principal + baseline.
 * Sortie : src/app/opengraph-image.png (convention Next → servie comme og:image par défaut sur tout le site).
 *
 * Régénération : node scripts/build-og-image.js
 */
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const sharp = require(path.join(ROOT, "node_modules/sharp"));

const W = 1200, H = 630;
const OUT = path.join(ROOT, "src/app/opengraph-image.png");
const LOGO = path.join(ROOT, "public/logos/logo-principal-couleur-trimmed.png");

function comp(dst, src, a) { return src * a + dst * (1 - a); }

// Fond hero sombre signature (identique à gen-backgrounds.js : base #0f1e38 + halos bleu/violet/vert/rouge).
// Rendu directement en buffer RGBA brut pour sharp (pas de dépendance pngjs).
function heroGradientRaw(width, height) {
  const data = Buffer.alloc(width * height * 4);
  const base = [15, 30, 56];
  const layers = [
    [239, 68, 68, 0.20, 0.75, 0.65, 0.40, 0.40],
    [16, 185, 129, 0.40, 0.55, 0.90, 0.45, 0.50],
    [138, 92, 246, 0.55, 0.85, 0.15, 0.50, 0.60],
    [74, 144, 217, 0.65, 0.10, 0.70, 0.60, 0.65],
  ];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = base[0], g = base[1], b = base[2];
      for (const L of layers) {
        const cx = L[4] * width, cy = L[5] * height, rx = L[6] * width, ry = L[7] * height;
        const dn = Math.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2);
        if (dn < 1) {
          const a = L[3] * (1 - dn);
          r = comp(r, L[0], a); g = comp(g, L[1], a); b = comp(b, L[2], a);
        }
      }
      const i = (width * y + x) << 2;
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
  }
  return data;
}

(async () => {
  const bgRaw = heroGradientRaw(W, H);
  const bg = await sharp(bgRaw, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();

  // Logo : largeur ~520px, centré horizontalement, dans la moitié haute
  const logoW = 520;
  const logoBuf = await sharp(LOGO).resize({ width: logoW }).toBuffer();
  const logoMeta = await sharp(logoBuf).metadata();
  const logoLeft = Math.round((W - logoW) / 2);
  const logoTop = 130;

  // Baseline sous le logo (SVG → PNG). Barre dégradée de marque en bas.
  const baselineY = logoTop + (logoMeta.height || 300) + 78;
  const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .baseline { fill: #ffffff; font-family: 'Poppins','Segoe UI',Arial,sans-serif; font-weight: 600; font-size: 46px; }
  </style>
  <text x="${W / 2}" y="${baselineY}" text-anchor="middle" class="baseline">Mieux exercer, avec les bons outils</text>
  <rect x="0" y="${H - 10}" width="${W * 0.28}" height="10" fill="#4A90D9"/>
  <rect x="${W * 0.28}" y="${H - 10}" width="${W * 0.32}" height="10" fill="#8A5CF6"/>
  <rect x="${W * 0.60}" y="${H - 10}" width="${W * 0.22}" height="10" fill="#E8734A"/>
  <rect x="${W * 0.82}" y="${H - 10}" width="${W * 0.18}" height="10" fill="#F5A623"/>
</svg>`;

  await sharp(bg)
    .composite([
      { input: logoBuf, left: logoLeft, top: logoTop },
      { input: Buffer.from(svg), left: 0, top: 0 },
    ])
    .png()
    .toFile(OUT);

  console.log("OK ->", path.relative(ROOT, OUT), `(${W}x${H})`);
})();
