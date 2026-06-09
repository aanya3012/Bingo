# BINGO — Multiplayer Online Game

A real-time multiplayer version of the classic Indian 1–25 Bingo game.  
Built with **Next.js 15**, **Supabase**, **Framer Motion**, and **Tailwind CSS**.

---

## Features

- 🎮 2–8 players per room
- ⚡ Real-time multiplayer via Supabase Realtime
- 🎨 Dark mode · Black + Crimson Red gaming aesthetic
- 🎲 Three modes: Classic (5×5), Quick (3×3), Chaos (7×7)
- 🃏 Drag-and-drop board setup
- 💬 Real-time chat with emoji reactions
- 🔊 Web Audio sound effects (no files needed)
- 👁 Spectator mode
- 🏆 Animated win screen
- 📱 Mobile-friendly responsive layout
- 🔗 Shareable room codes — no login required

---

## Quick Start

### 1. Clone & install

```bash
git clone <your-repo>
cd bingo-game
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy your **Project URL** and **Anon Key** from Settings → API

### 3. Set up the database

In your Supabase dashboard → **SQL Editor**, paste and run the contents of:

```
supabase/migrations/001_initial_schema.sql
```

This creates all tables, indexes, RLS policies, and enables Realtime.

### 4. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
bingo-game/
├── app/
│   ├── page.tsx              # Landing page (create/join room)
│   ├── lobby/[id]/page.tsx   # Waiting lobby
│   ├── game/[id]/page.tsx    # Main gameplay
│   └── globals.css           # Global styles
├── components/
│   ├── game/
│   │   ├── bingo-board.tsx   # Interactive 5×5 (or 3/7) grid
│   │   ├── board-setup.tsx   # Drag-and-drop board creator
│   │   ├── bingo-progress.tsx # B-I-N-G-O letter tracker
│   │   ├── player-list.tsx   # Sidebar player list
│   │   └── win-screen.tsx    # Victory modal
│   ├── chat/
│   │   └── chat-panel.tsx    # Realtime chat
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── supabase.ts           # Supabase client
│   ├── game-logic.ts         # Pure game functions
│   ├── sounds.ts             # Web Audio sound effects
│   └── utils.ts              # cn() helper
├── hooks/
│   └── use-toast.ts          # Toast notifications
├── types/
│   └── index.ts              # TypeScript types
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql
```

---

## Game Flow

```
Landing Page
    │
    ├── Create Room ──► Lobby (host waits for players)
    │                       │
    └── Join Room ──────────┘
                            │
                    All ready → Host starts
                            │
                    Board Setup (drag & arrange)
                            │
                    All boards submitted
                            │
                    Gameplay (turn-based calling)
                            │
                    First to complete all lines → Win Screen
```

---

## Database Schema

| Table      | Purpose                              |
|------------|--------------------------------------|
| `rooms`    | Room state, called numbers, turn     |
| `players`  | Each player's board, marked cells, progress |
| `moves`    | History of called numbers            |
| `messages` | Chat + system + game event messages  |

---

## Deploying to Vercel

```bash
npm run build   # verify it builds
vercel deploy   # or push to GitHub and connect to Vercel
```

Add your env vars in the Vercel dashboard under Settings → Environment Variables.

---

## Customization

- **Colors**: Edit `tailwind.config.ts` → `crimson` palette
- **Game modes**: Add entries to `GRID_CONFIG` in `types/index.ts`
- **Sound effects**: Edit `lib/sounds.ts` — all Web Audio, no files needed
- **Max players**: Default is 8; adjustable per room on the landing page

---

## License

MIT
