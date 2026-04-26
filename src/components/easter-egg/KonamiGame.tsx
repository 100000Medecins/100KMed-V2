'use client'

import { useEffect, useRef, useState } from 'react'

// ─── Konami sequence ──────────────────────────────────────────────────────
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']

// ─── Canvas ───────────────────────────────────────────────────────────────
const CW = 480, CH = 520
const S = 3  // 1 logical pixel = 3 canvas pixels

// ─── Pixel sprites 8×8 (flat row-major, 0=transparent 1=on) ──────────────
const EV0 = [  // virus couronne — lignes 0-1
  0,1,0,0,0,0,1,0,
  0,0,1,1,1,1,0,0,
  0,1,1,1,1,1,1,0,
  1,1,0,1,1,0,1,1,
  1,1,1,1,1,1,1,1,
  0,1,1,0,0,1,1,0,
  0,0,1,0,0,1,0,0,
  0,1,0,0,0,0,1,0,
]
const EV1 = [  // virus rond — ligne 2
  0,0,1,0,0,1,0,0,
  0,1,0,1,1,0,1,0,
  1,1,1,1,1,1,1,1,
  1,0,1,1,1,1,0,1,
  1,1,1,1,1,1,1,1,
  0,1,0,1,1,0,1,0,
  1,0,0,0,0,0,0,1,
  0,0,1,0,0,1,0,0,
]
const EV2 = [  // virus gros — ligne 3
  0,0,0,1,1,0,0,0,
  0,1,1,1,1,1,1,0,
  1,1,0,1,1,0,1,1,
  1,1,1,1,1,1,1,1,
  1,0,1,1,1,1,0,1,
  1,1,1,1,1,1,1,1,
  0,1,0,0,0,0,1,0,
  0,0,1,0,0,1,0,0,
]
const EV_SPR = [EV0, EV0, EV1, EV2]
const EV_COL = ['#FF6B9D', '#C084FC', '#818CF8', '#38BDF8']

// Canon gélule 8×8
const CANNON = [
  0,0,0,1,1,0,0,0,
  0,0,1,1,1,1,0,0,
  0,0,1,1,1,1,0,0,
  0,1,1,1,1,1,1,0,
  1,1,1,1,1,1,1,1,
  1,1,1,1,1,1,1,1,
  1,0,0,0,0,0,0,1,
  0,0,0,0,0,0,0,0,
]

// ─── Paramètres de jeu ────────────────────────────────────────────────────
const GCOLS = 10, GROWS = 4
const CEW = 8 * S + 16   // largeur cellule : 24 + 16 = 40 px
const CEH = 8 * S + 14   // hauteur cellule : 24 + 14 = 38 px
const GX0 = Math.floor((CW - GCOLS * CEW) / 2)  // = 40
const GY0 = 80
const PLY = CH - 56   // y joueur (bas du sprite)
const PW = 8 * S, PH = 8 * S
const PSPEED = 4
const BSPEED = 8, ESPEED = 3
const ESTEP = 6, EDROP = 16
const BASE_INT = 55  // frames entre déplacements ennemis

// Étoiles statiques (pseudo-aléatoire déterministe)
const STARS = Array.from({ length: 42 }, (_, i) => ({
  x: Math.floor(((i * 137 + 23) * 97) % CW),
  y: Math.floor(((i * 47 + 11) * 53) % CH),
}))

// ─── Types ────────────────────────────────────────────────────────────────
type Phase = 'title' | 'playing' | 'dead' | 'won'

interface GS {
  phase: Phase
  score: number; hi: number; lives: number
  px: number
  grid: boolean[][]
  gox: number; goy: number; gdir: number
  gtick: number; interval: number
  pb: { x: number; y: number } | null
  ebs: { x: number; y: number }[]
  etick: number
  boom: { x: number; y: number; t: number }[]
  keys: Set<string>
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function makeGrid(): boolean[][] {
  return Array.from({ length: GROWS }, () => new Array(GCOLS).fill(true))
}
function countAlive(grid: boolean[][]): number {
  let n = 0
  for (const row of grid) for (const c of row) if (c) n++
  return n
}
function gex(gs: GS, col: number) { return GX0 + col * CEW + gs.gox }
function gey(gs: GS, row: number) { return GY0 + row * CEH + gs.goy }

function pxl(ctx: CanvasRenderingContext2D, data: number[], x: number, y: number, color: string) {
  ctx.fillStyle = color
  for (let i = 0; i < 64; i++) {
    if (data[i]) ctx.fillRect(x + (i % 8) * S, y + Math.floor(i / 8) * S, S, S)
  }
}
function txt(
  ctx: CanvasRenderingContext2D,
  s: string, x: number, y: number,
  color: string, sz = 14,
  align: CanvasTextAlign = 'left'
) {
  ctx.fillStyle = color
  ctx.font = `bold ${sz}px 'Courier New', monospace`
  ctx.textAlign = align
  ctx.fillText(s, x, y)
}

// ─── Composant ───────────────────────────────────────────────────────────
export default function KonamiGame() {
  const [open, setOpen] = useState(false)
  const cvs = useRef<HTMLCanvasElement>(null)
  const af = useRef(0)
  const seq = useRef<string[]>([])

  // Détection Konami
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      seq.current.push(e.key)
      if (seq.current.length > KONAMI.length) seq.current.shift()
      if (seq.current.join() === KONAMI.join()) {
        seq.current = []
        setOpen(true)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  // Boucle de jeu
  useEffect(() => {
    if (!open) return
    const canvas = cvs.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = false

    let gs: GS = {
      phase: 'title',
      score: 0, hi: 0, lives: 3,
      px: CW / 2,
      grid: makeGrid(),
      gox: 0, goy: 0, gdir: 1,
      gtick: 0, interval: BASE_INT,
      pb: null, ebs: [], etick: 0, boom: [],
      keys: new Set(),
    }

    const reset = () => {
      const hi = gs.hi
      gs = {
        phase: 'playing',
        score: 0, hi, lives: 3,
        px: CW / 2,
        grid: makeGrid(),
        gox: 0, goy: 0, gdir: 1,
        gtick: 0, interval: BASE_INT,
        pb: null, ebs: [], etick: 0, boom: [],
        keys: gs.keys,
      }
    }

    const kd = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); return }
      gs.keys.add(e.key)
      if (e.key === ' ' && gs.phase !== 'playing') reset()
    }
    const ku = (e: KeyboardEvent) => gs.keys.delete(e.key)
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)

    const update = () => {
      if (gs.phase !== 'playing') return

      // Déplacement joueur
      if ((gs.keys.has('ArrowLeft') || gs.keys.has('a')) && gs.px > PW / 2 + 4)
        gs.px -= PSPEED
      if ((gs.keys.has('ArrowRight') || gs.keys.has('d')) && gs.px < CW - PW / 2 - 4)
        gs.px += PSPEED

      // Tir joueur
      if (gs.keys.has(' ') && !gs.pb) {
        gs.pb = { x: gs.px, y: PLY - PH }
        gs.keys.delete(' ')
      }

      // Mouvement projectile joueur
      if (gs.pb) {
        gs.pb.y -= BSPEED
        if (gs.pb.y < 0) {
          gs.pb = null
        } else {
          outer: for (let r = 0; r < GROWS; r++) {
            for (let c = 0; c < GCOLS; c++) {
              if (!gs.grid[r][c]) continue
              const ex = gex(gs, c), ey = gey(gs, r)
              if (gs.pb.x >= ex && gs.pb.x <= ex + 8*S && gs.pb.y >= ey && gs.pb.y <= ey + 8*S) {
                gs.grid[r][c] = false
                gs.score += r === 0 ? 30 : r === 1 ? 20 : r === 2 ? 15 : 10
                gs.hi = Math.max(gs.hi, gs.score)
                gs.boom.push({ x: ex + 4*S, y: ey + 4*S, t: 18 })
                gs.pb = null
                const n = countAlive(gs.grid)
                gs.interval = Math.max(6, Math.round(BASE_INT * n / (GCOLS * GROWS)))
                if (n === 0) gs.phase = 'won'
                break outer
              }
            }
          }
        }
      }

      // Mouvement des ennemis
      if (++gs.gtick >= gs.interval) {
        gs.gtick = 0
        let lc = GCOLS, rc = -1
        for (let r = 0; r < GROWS; r++)
          for (let c = 0; c < GCOLS; c++)
            if (gs.grid[r][c]) { lc = Math.min(lc, c); rc = Math.max(rc, c) }

        const le = GX0 + lc * CEW + gs.gox
        const re = GX0 + rc * CEW + 8*S + gs.gox

        if (gs.gdir === 1 && re + ESTEP > CW - 4) {
          gs.goy += EDROP; gs.gdir = -1
        } else if (gs.gdir === -1 && le - ESTEP < 4) {
          gs.goy += EDROP; gs.gdir = 1
        } else {
          gs.gox += gs.gdir * ESTEP
        }

        // Invasion : ennemis atteignent le joueur
        for (let r = 0; r < GROWS; r++)
          for (let c = 0; c < GCOLS; c++)
            if (gs.grid[r][c] && gey(gs, r) + 8*S >= PLY) { gs.phase = 'dead'; return }
      }

      // Tirs ennemis
      if (++gs.etick >= 65) {
        gs.etick = 0
        const shooters: [number, number][] = []
        for (let c = 0; c < GCOLS; c++)
          for (let r = GROWS - 1; r >= 0; r--)
            if (gs.grid[r][c]) { shooters.push([r, c]); break }
        if (shooters.length && gs.ebs.length < 4) {
          const [r, c] = shooters[Math.floor(Math.random() * shooters.length)]
          gs.ebs.push({ x: gex(gs, c) + 4*S, y: gey(gs, r) + 8*S })
        }
      }

      // Mouvement projectiles ennemis + collision joueur
      let hitPlayer = false
      gs.ebs = gs.ebs.filter(b => {
        b.y += ESPEED
        if (!hitPlayer && Math.abs(b.x - gs.px) < PW / 2 + 2 && b.y >= PLY - PH && b.y <= PLY + 4) {
          hitPlayer = true
          if (--gs.lives <= 0) gs.phase = 'dead'
          return false
        }
        return b.y < CH
      })
      if (hitPlayer && (gs.phase as Phase) !== 'dead') { gs.ebs = []; gs.pb = null }

      gs.boom = gs.boom.filter(f => { f.t--; return f.t > 0 })
    }

    const render = () => {
      ctx.imageSmoothingEnabled = false

      // Fond dégradé sombre
      const bg = ctx.createLinearGradient(0, 0, 0, CH)
      bg.addColorStop(0, '#060918')
      bg.addColorStop(0.45, '#110820')
      bg.addColorStop(1, '#060918')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, CW, CH)

      // Lignes de scan (effet CRT)
      ctx.fillStyle = 'rgba(0,0,0,0.10)'
      for (let y = 0; y < CH; y += 4) ctx.fillRect(0, y, CW, 2)

      // Étoiles
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      for (const { x, y } of STARS) ctx.fillRect(x, y, 1, 1)

      // ─ HUD ──────────────────────────────────────────────────────────────
      txt(ctx, `SCORE ${gs.score.toString().padStart(6, '0')}`, 10, 22, '#38BDF8', 11)
      txt(ctx, `HI ${gs.hi.toString().padStart(6, '0')}`, CW / 2, 22, '#FF6B9D', 11, 'center')
      // Vies : petites gélules
      for (let i = 0; i < Math.max(0, gs.lives); i++) {
        const lx = CW - 10 - i * 14
        ctx.fillStyle = '#FF6B9D'; ctx.fillRect(lx, 9, 10, 6)
        ctx.fillStyle = '#c8c8ff'; ctx.fillRect(lx, 15, 10, 5)
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(lx, 14, 10, 2)
      }

      // Ligne de sol
      ctx.fillStyle = '#1e3a5f'
      ctx.fillRect(0, CH - 36, CW, 1)
      ctx.fillStyle = '#38BDF8'
      ctx.fillRect(0, CH - 35, CW, 1)

      // ─ Écran titre ───────────────────────────────────────────────────────
      if (gs.phase === 'title') {
        txt(ctx, 'VIRUS', CW / 2, CH / 2 - 50, '#FF6B9D', 38, 'center')
        txt(ctx, 'INVADERS', CW / 2, CH / 2 - 6, '#C084FC', 38, 'center')

        // Halo violet derrière le titre
        const glow = ctx.createRadialGradient(CW/2, CH/2 - 28, 10, CW/2, CH/2 - 28, 120)
        glow.addColorStop(0, 'rgba(192,132,252,0.15)')
        glow.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = glow
        ctx.fillRect(CW/2 - 120, CH/2 - 148, 240, 160)

        txt(ctx, '← → DÉPLACER    ESPACE TIRER', CW/2, CH/2 + 46, '#818CF8', 11, 'center')
        txt(ctx, 'APPUYER SUR ESPACE', CW/2, CH/2 + 72, '#38BDF8', 15, 'center')
        txt(ctx, '[ESC] QUITTER', CW/2, CH/2 + 96, '#334155', 11, 'center')

        // Démo ennemis + points
        const pts = [30, 20, 15, 10]
        for (let r = 0; r < GROWS; r++) {
          const sy = CH / 2 - 162 + r * 30
          pxl(ctx, EV_SPR[r], CW / 2 - 50, sy, EV_COL[r])
          txt(ctx, `= ${pts[r]} PTS`, CW / 2 - 26, sy + 17, EV_COL[r], 11)
        }
        return
      }

      // ─ Ennemis ───────────────────────────────────────────────────────────
      for (let r = 0; r < GROWS; r++) {
        for (let c = 0; c < GCOLS; c++) {
          if (!gs.grid[r][c]) continue
          pxl(ctx, EV_SPR[r], gex(gs, c), gey(gs, r), EV_COL[r])
        }
      }

      // ─ Explosions ────────────────────────────────────────────────────────
      for (const b of gs.boom) {
        const alpha = b.t / 18
        const rad = (1 - alpha) * 22
        ctx.fillStyle = `rgba(255,220,80,${alpha * 0.85})`
        ctx.fillRect(b.x - rad / 2, b.y - rad / 2, rad, rad)
        ctx.fillStyle = `rgba(255,120,180,${alpha * 0.5})`
        ctx.fillRect(b.x - rad / 4, b.y - rad / 4, rad / 2, rad / 2)
      }

      // ─ Canon joueur ──────────────────────────────────────────────────────
      // Corps bleu clair
      pxl(ctx, CANNON, Math.round(gs.px) - PW / 2, PLY - PH, '#7DD3FC')
      // Détail gélule (rose / blanc) sur le "barrel"
      const cx = Math.round(gs.px)
      ctx.fillStyle = '#FF6B9D'
      ctx.fillRect(cx - S, PLY - PH, 2*S, 3*S)
      ctx.fillStyle = '#e0e8ff'
      ctx.fillRect(cx - S, PLY - PH + 3*S, 2*S, 2*S)

      // ─ Projectile joueur ─────────────────────────────────────────────────
      if (gs.pb) {
        ctx.fillStyle = '#FF6B9D'
        ctx.fillRect(gs.pb.x - S, gs.pb.y, 2*S, 3*S)
        ctx.fillStyle = '#c8c8ff'
        ctx.fillRect(gs.pb.x - S, gs.pb.y + 3*S, 2*S, 3*S)
        ctx.fillStyle = 'rgba(255,107,157,0.3)'
        ctx.fillRect(gs.pb.x - 3, gs.pb.y, 6, 18)
      }

      // ─ Projectiles ennemis ────────────────────────────────────────────────
      for (const b of gs.ebs) {
        ctx.fillStyle = '#FF6B9D'
        ctx.fillRect(b.x - S, b.y, 2*S, 4*S)
        ctx.fillStyle = 'rgba(255,107,157,0.25)'
        ctx.fillRect(b.x - 3, b.y, 6, 12)
      }

      // ─ Écran game over / victoire ─────────────────────────────────────────
      if (gs.phase === 'dead' || gs.phase === 'won') {
        ctx.fillStyle = 'rgba(6,9,24,0.82)'
        ctx.fillRect(0, 0, CW, CH)

        const glowC = ctx.createRadialGradient(CW/2, CH/2, 10, CW/2, CH/2, 180)
        if (gs.phase === 'won') {
          glowC.addColorStop(0, 'rgba(255,107,157,0.18)')
          glowC.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = glowC; ctx.fillRect(0, 0, CW, CH)
          txt(ctx, 'VICTOIRE !', CW/2, CH/2 - 28, '#FF6B9D', 32, 'center')
        } else {
          glowC.addColorStop(0, 'rgba(192,132,252,0.18)')
          glowC.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = glowC; ctx.fillRect(0, 0, CW, CH)
          txt(ctx, 'GAME OVER', CW/2, CH/2 - 28, '#C084FC', 32, 'center')
        }
        txt(ctx, `SCORE : ${gs.score}`, CW/2, CH/2 + 18, '#38BDF8', 18, 'center')
        txt(ctx, 'ESPACE pour rejouer', CW/2, CH/2 + 58, '#818CF8', 13, 'center')
      }
    }

    const loop = () => {
      update()
      render()
      af.current = requestAnimationFrame(loop)
    }
    af.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(af.current)
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(10,90,90,0.97) 0%, rgba(80,30,130,0.95) 55%, rgba(20,50,110,0.97) 100%)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 8px 48px rgba(0,0,0,0.6), 0 0 60px rgba(138,92,246,0.25)',
        }}
        className="rounded-2xl p-4 flex flex-col gap-3"
      >
        <div className="flex items-center justify-between px-1">
          <span style={{ fontFamily: 'monospace', color: '#FF6B9D', fontWeight: 700, fontSize: 12, letterSpacing: 3 }}>
            ↑↑↓↓←→←→BA
          </span>
          <button
            onClick={() => setOpen(false)}
            style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}
            className="hover:text-white transition-colors"
          >
            [ESC]
          </button>
        </div>
        <canvas
          ref={cvs}
          width={CW}
          height={CH}
          style={{ imageRendering: 'pixelated', display: 'block' }}
          className="rounded-lg"
        />
      </div>
    </div>
  )
}
