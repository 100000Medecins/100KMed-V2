# 100000medecins.org

Plateforme d'avis et de comparaison de logiciels medicaux par et pour les medecins liberaux français. Editee par l'association 100 000 Medecins.

## Stack technique

- **Next.js 14** (App Router, Server Components, Server Actions)
- **Supabase** (PostgreSQL, Auth, Storage, RLS)
- **Tailwind CSS**
- **Zustand** (state management cote client)
- **SendGrid** (emails transactionnels)
- **Claude API / Anthropic** (generation d'articles, posts sociaux, suggestion de mots-cles)
- **Unsplash API** (suggestion d'images de couverture)
- **Make.com** (automatisation publication reseaux sociaux via webhook)
- **ProSante Connect** (authentification SSO medecins via carte CPS)

## Variables d'environnement

Copier `.env.example` en `.env.local` :

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Site
NEXT_PUBLIC_SITE_URL=https://100000medecins.org

# Admin
ADMIN_PASSWORD=

# Emails
SENDGRID_API_KEY=

# IA
ANTHROPIC_API_KEY=           # Generation articles + posts sociaux (Claude Sonnet / Haiku)
UNSPLASH_ACCESS_KEY=         # Suggestion images de couverture

# Reseaux sociaux
MAKE_WEBHOOK_URL=            # Webhook Make.com → publication LinkedIn / Facebook / Instagram

# ProSante Connect (SSO medecins)
PSC_CLIENT_ID=
PSC_CLIENT_SECRET=
PSC_REDIRECT_URI=
```

## Installation

```bash
npm install
cp .env.example .env.local
# Renseigner les variables ci-dessus
npm run dev
```

## Developpement

```bash
npm run dev       # Serveur de dev (localhost:3000)
npm run build     # Build production
npm run lint      # ESLint + TypeScript
```

## Structure du projet

```
src/
├── app/
│   ├── admin/            # Back-office (auth par mot de passe ADMIN_PASSWORD)
│   │   ├── blog/         # Gestion articles : liste, creation, modification
│   │   ├── index/        # Editeur page d'accueil + config navigation
│   │   └── solutions/    # Gestion solutions logicielles
│   ├── api/
│   │   ├── generer-article/        # POST : brief → article complet via Claude
│   │   ├── generer-posts-sociaux/  # POST : titre+extrait → 3 posts reseaux via Claude
│   │   ├── social-publish/         # POST : relais vers webhook Make.com
│   │   └── suggerer-image/         # POST : mots-cles → photos Unsplash
│   ├── blog/             # Pages publiques blog (/blog, /blog/[slug])
│   ├── solutions/        # Fiches et categories solutions
│   ├── mon-compte/       # Espace utilisateur connecte
│   └── connexion/        # Auth (email/password + ProSante Connect)
├── components/
│   ├── admin/
│   │   ├── ArticleForm.tsx     # Formulaire article avec generation Claude integree
│   │   └── SocialPanel.tsx     # Panneau publication reseaux sociaux
│   ├── layout/           # Navbar, Footer
│   └── ui/               # Composants reutilisables
├── lib/
│   ├── actions/admin.ts  # Server Actions : CRUD articles, solutions, config
│   ├── db/               # Requetes Supabase server-side
│   └── supabase/         # Clients Supabase (server, client, middleware)
├── stores/               # Zustand stores
└── types/
    └── database.ts       # Types Supabase generes (regenerer avec Supabase CLI si schema change)
```

## Regenerer les types Supabase

Apres toute migration de schema Supabase :

```bash
npx supabase gen types typescript --project-id qnspmlskzgqrqtuvsbuo > src/types/database.ts
```

## Architecture publication reseaux sociaux

```
Admin → SocialPanel → POST /api/social-publish
                              ↓
                       Make.com webhook
                         ↓    ↓    ↓
                      LinkedIn Facebook Instagram
```

Make.com recoit : `{ network, text, scheduled_at, image_url, article_url }`
et route vers le bon reseau via un Router avec filtre sur `network`.

## ProSante Connect

L'authentification SSO via carte CPS est configuree pour l'environnement BAC (test).
Pour la production : mettre a jour `PSC_CLIENT_ID`, `PSC_CLIENT_SECRET` et `PSC_REDIRECT_URI`
avec les credentials de l'environnement production ANS.
