# 10000medecins.org

Plateforme d'avis et de comparaison de logiciels medicaux par et pour les professionnels de sante.

## Stack technique

- **Next.js 14** (App Router)
- **Supabase** (PostgreSQL, Auth, RLS)
- **Tailwind CSS**
- **Zustand** (state management)
- **SendGrid** (emails)

## Installation

```bash
npm install
```

Copier `.env.example` en `.env.local` et renseigner les variables :

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
ADMIN_PASSWORD=
SENDGRID_API_KEY=
```

## Developpement

```bash
npm run dev       # Serveur de dev (localhost:3000)
npm run build     # Build production
npm run lint      # ESLint
```

## Structure du projet

```
src/
├── app/              # Pages (App Router)
│   ├── admin/        # Back-office admin
│   ├── mon-compte/   # Espace utilisateur connecte
│   ├── solutions/    # Pages categories et fiches solutions
│   ├── connexion/    # Authentification
│   └── (static)/     # Pages statiques (CGU, videos, actualites...)
├── components/       # Composants React
│   ├── layout/       # Navbar, Footer
│   ├── sections/     # Sections homepage
│   ├── solutions/    # Composants fiches solutions
│   └── ui/           # Composants UI reutilisables
├── lib/
│   ├── db/           # Requetes Supabase (server-side)
│   ├── actions/      # Server Actions (formulaires)
│   └── supabase/     # Configuration clients Supabase
├── stores/           # Zustand stores
└── types/            # Types TypeScript
```
