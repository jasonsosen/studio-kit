# Studio Kit Web

AI-powered content management for Pilates studios - Web version.

## Quick Start

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your API keys:

```bash
cp .env.example .env.local
```

Required for AI features:
- `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`

## Project Structure

```
web/
├── src/
│   ├── app/
│   │   ├── page.tsx           # Calendar view (main)
│   │   ├── api/ai/generate/   # AI caption generation
│   │   └── ...
│   ├── components/
│   │   ├── Navigation.tsx     # Sidebar nav
│   │   ├── ContentEditor.tsx  # Post editor modal
│   │   └── ...
│   └── lib/
│       └── types.ts           # TypeScript types
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **UI Icons**: Lucide React
- **Date handling**: date-fns
- **AI**: Claude / OpenAI

## Migration Status

### ✅ Phase 1 (Complete)
- [x] Project setup
- [x] Calendar view
- [x] Content editor modal
- [x] AI caption generation API
- [x] Navigation

### 🔄 Phase 2 (Next)
- [ ] Database setup (Supabase/Neon)
- [ ] User authentication
- [ ] Data persistence
- [ ] Media upload to R2

### 📋 Phase 3 (Later)
- [ ] Weekly plan generation
- [ ] API usage tracking
- [ ] Settings page
- [ ] Subtitle generation (cloud API)

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jasonsosen/studio-kit)

## License

Private
