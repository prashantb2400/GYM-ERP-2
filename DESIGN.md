# Product Design System

## Brand
- **Product Name**: Nexus SaaS Platform
- **Primary Visual Direction**: Clean, modern, accessible enterprise dashboard with high contrast, precise 4px/8px grid alignment, and subtle interactive micro-states.

## Typography
- **Font Family**: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- **Heading Scale**:
  - `h1`: 2rem (32px), `font-bold`, `tracking-tight`, line-height 1.25
  - `h2`: 1.5rem (24px), `font-semibold`, `tracking-tight`, line-height 1.3
  - `h3`: 1.25rem (20px), `font-semibold`, line-height 1.35
  - `h4`: 1rem (16px), `font-medium`, line-height 1.4
- **Body Scale**:
  - `body-lg`: 1.125rem (18px), line-height 1.5
  - `body`: 0.875rem (14px), line-height 1.5, regular/medium
  - `body-sm`: 0.75rem (12px), line-height 1.4, regular/medium
  - `caption`: 0.6875rem (11px), line-height 1.3, text-muted-foreground

## Colors & Tokens
- **Background**: `hsl(var(--background))` / `#090d16` (Dark), `#ffffff` (Light)
- **Foreground**: `hsl(var(--foreground))` / `#f8fafc` (Dark), `#0f172a` (Light)
- **Card / Surface**: `hsl(var(--card))` / `#111827` (Dark), `#ffffff` (Light)
- **Card Foreground**: `hsl(var(--card-foreground))` / `#f8fafc`
- **Primary**: `hsl(var(--primary))` / `#3b82f6` (Blue-500)
- **Primary Foreground**: `hsl(var(--primary-foreground))` / `#ffffff`
- **Secondary**: `hsl(var(--secondary))` / `#1e293b`
- **Secondary Foreground**: `hsl(var(--secondary-foreground))` / `#f8fafc`
- **Muted**: `hsl(var(--muted))` / `#1e293b`
- **Muted Foreground**: `hsl(var(--muted-foreground))` / `#94a3b8`
- **Accent**: `hsl(var(--accent))` / `#1e293b`
- **Accent Foreground**: `hsl(var(--accent-foreground))` / `#f8fafc`
- **Destructive**: `hsl(var(--destructive))` / `#ef4444`
- **Destructive Foreground**: `hsl(var(--destructive-foreground))` / `#ffffff`
- **Border**: `hsl(var(--border))` / `#1e293b` (Dark), `#e2e8f0` (Light)
- **Input Ring**: `hsl(var(--ring))` / `#3b82f6`

## Layout & Spatial System
- **Container**: Max width `1280px` (`max-w-7xl`), centered with `px-4 sm:px-6 lg:px-8`
- **Spacing Scale**: 4px base (4, 8, 12, 16, 20, 24, 32, 40, 48, 64px)
- **Border Radius**:
  - `sm`: `0.25rem` (4px)
  - `md`: `0.375rem` (6px)
  - `lg`: `0.5rem` (8px)
  - `full`: `9999px`

## UI Components
- **Buttons**: `default`, `secondary`, `destructive`, `outline`, `ghost`, `link` with `h-9 px-4 py-2` default size and active/focus rings.
- **Inputs & Textareas**: `bg-background border border-input rounded-md px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring`.
- **Cards**: `rounded-lg border bg-card text-card-foreground shadow-sm` with distinct header, title, description, content, and footer sections.
- **Tabs**: Pill or line tabs with `inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1`.
- **Badges & Switches**: Consistent status indicators with distinct colors for verified, pending, security tiers.

## Rules
- Always use CSS variables and Tailwind utility classes mapping to design tokens.
- Never hardcode HEX colors directly in component JSX.
- Preserve accessibility contrast ratios (WCAG AAA/AA).
