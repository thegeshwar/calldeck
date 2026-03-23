# CallDeck — Project Rules

## Stack
- Next.js 15 (App Router), Tailwind v4, Supabase
- Fonts: Outfit (display) + JetBrains Mono (data/labels)
- Icons: lucide-react — zero emojis anywhere
- Dev: `npm run dev -- -p 3002`
- DB: Local Supabase (API 54321, DB 54322)

## Design System: Obsidian Wine
- **Root**: `#08040a` | **Surface**: `#110a14` | **Elevated**: `#1a101e`
- **Border**: `#2a1832` | **Border bright**: `#3a2245`
- **Text primary**: `#e4dbe8` | **Text secondary**: `#7a5c84` | **Text muted**: `#6b4d75`
- **Green**: `#22c55e` | **Amber**: `#f59e0b` | **Red**: `#ef4444`
- **Blue**: `#3b82f6` | **Purple**: `#8b5cf6` | **Cyan**: `#06b6d4`

## Element Style: Bold & Heavy
- Stat badges: 2px borders, gradient fills, 22px mono weight-900 numbers
- Pills: 2px borders, filled bg, 10px mono uppercase
- Primary buttons: box-shadow depth, uppercase, letter-spacing
- Cards: 2px borders, elevated bg

## Animation: Scan Line (Attention-Driven)
- Only on elements needing attention (overdue, hot, CTA buttons)
- CSS-only: `.attn::after` with scan keyframe

## Spec
- Design spec: `/home/ubuntu/qms-agents/docs/superpowers/specs/2026-03-23-calldeck-design.md`
- Implementation plan: `/home/ubuntu/qms-agents/docs/superpowers/plans/2026-03-23-calldeck-implementation.md`
