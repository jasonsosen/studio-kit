# Studio Kit Web

AI-powered content management for Pilates studios - Web version.

## 🚀 Quick Start

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🔧 Setup

### 1. Environment Variables

```bash
cp .env.example .env.local
```

Required:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key

Optional (for AI features):
- `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`

### 2. Database Setup

1. Create a [Supabase](https://supabase.com) project
2. Run the schema in `supabase/schema.sql` via SQL Editor
3. Enable Storage and create a bucket named `assets`

## 📁 Project Structure

```
web/
├── src/
│   ├── app/
│   │   ├── page.tsx              # 📅 Calendar (main)
│   │   ├── weekly/page.tsx       # 🗓️ Weekly plan generator
│   │   ├── assets/page.tsx       # 📁 Media management
│   │   ├── usage/page.tsx        # 📊 API usage stats
│   │   ├── settings/page.tsx     # ⚙️ Settings
│   │   ├── login/page.tsx        # 🔐 Login
│   │   └── api/
│   │       └── ai/
│   │           ├── generate/     # AI caption generation
│   │           └── weekly-plan/  # AI weekly topics
│   ├── components/
│   │   ├── Navigation.tsx
│   │   └── ContentEditor.tsx
│   └── lib/
│       ├── types.ts
│       ├── db.ts
│       └── supabase/
│           ├── client.ts
│           └── server.ts
├── supabase/
│   └── schema.sql               # Database schema
└── middleware.ts                # Auth protection
```

## ✨ Features

### ✅ Implemented
- [x] User authentication (Supabase Auth)
- [x] Studio settings management
- [x] Calendar view with post management
- [x] AI caption generation (Claude/OpenAI)
- [x] Weekly plan generation
- [x] Media asset management
- [x] API usage tracking (JPY)
- [x] Responsive design

### 🔜 Coming Soon
- [ ] Cloud subtitle generation (Whisper API)
- [ ] Instagram direct publishing
- [ ] Team collaboration
- [ ] Export/Import

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage (or Cloudflare R2)
- **AI**: Claude / OpenAI
- **Auth**: Supabase Auth
- **Deploy**: Vercel

## 🚀 Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jasonsosen/studio-kit&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY)

## 📝 License

Private
