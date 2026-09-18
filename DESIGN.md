# Design System: GymERP (Gym Operations & Biometric Intelligence Platform)

## 1. Visual Theme & Atmosphere
GymERP is an enterprise-grade biometric operating system and financial cockpit for modern fitness facilities. The visual atmosphere is **High-Density Cockpit Operational** (Density: 7/10, Variance: 6/10, Motion: 6/10) — clinical, precise, and authoritative, yet tactile and refined like machined aeronautical hardware.

Surfaces evoke physical instruments: deep obsidian and slate foundations, hairline translucent borders, and concentric **Double-Bezel (Doppelrand)** enclosures. Motion is strictly physical, driven by critically damped spring physics and tactile push depressions without latency or neon digital artifacts.

---

## 2. Calibrated Color Palette & Roles
The platform strictly enforces a **single calibrated accent** philosophy (saturation < 80%), anchored by pure neutral slate and obsidian bases. Neon glows, purple button halos, and arbitrary multicolor accents are strictly banned.

- **Obsidian Canvas** (`#09090b` / `oklch(0.12 0.005 285)`) — Primary dark background, rich and deep off-black with zero pure `#000000` dead zones.
- **Machined Slate Core** (`#121215` / `oklch(0.15 0.006 285)`) — Elevated container and card surface; provides tactile contrast against the obsidian floor.
- **Translucent Glass Surface** (`rgba(18, 18, 22, 0.70)`) — Topbars, floating drawers, and backdrop-blur panels with 20px blur and 180% saturation.
- **Athletic Indigo Accent** (`#6366f1` / `oklch(0.60 0.21 275)`) — Single functional accent reserved for primary CTAs, active tab pills, focus indicators, and key operational alerts.
- **High-Contrast Ink** (`#f8fafc` / `oklch(0.98 0.002 285)`) — Primary typography, metric readouts, and high-priority statuses.
- **Muted Zinc** (`#a1a1aa` / `oklch(0.65 0.012 285)`) — Secondary copy, units of measurement, captions, and structural labels.
- **Hairline Boundary** (`#27272a` / `oklch(0.24 0.008 285)`) — 1px structural borders and division rules (`rgba(255, 255, 255, 0.08)`).
- **Specular Top Highlight** (`rgba(255, 255, 255, 0.12)`) — 1px light-catching specular rim on cards and active buttons.

---

## 3. Typographic Architecture
GymERP pairs modern geometric grotesque display fonts with monospaced tabular figures. Generic system fonts and standard serifs are completely eliminated.

- **Display & Headlines**: `Geist` (Sans-Serif).
  - Tighter negative tracking (`letter-spacing: -0.025em` to `-0.035em`).
  - Strict **Sentence case** across all major page headers and section titles (no Title Case shouting).
  - Controlled line-height (`1.12` to `1.2`) for tight typographic density.
- **Body & Controls**: `Geist` (Sans-Serif).
  - Line length limited to max 65 characters (`max-w-[65ch]`) with relaxed leading (`1.5` to `1.6`).
  - Balanced text wrap (`text-wrap: balance` / `text-wrap: pretty`) to eliminate orphaned single words.
- **Operational Numbers & Data**: `Geist Mono` (`font-mono`).
  - Universal tabular figures (`font-variant-numeric: tabular-nums`) across all financial sums (₹), attendance check-ins, reps, weights, percentages, and timestamps.
- **Capsule Badges**: Microscopic uppercase tracking (`text-[10px] font-mono tracking-wider uppercase`).
- **Banned Typography**: `Inter`, `Roboto`, `Arial`, and all generic serif fonts (`Times New Roman`, `Georgia`, `Garamond`). Serifs are banned across all dashboard and operational screens.

---

## 4. Hardware Component Specifications

### A. The Double-Bezel (Doppelrand) Architecture
Major cards, preview windows, and telemetry panels do not sit flatly on the canvas. They are engineered as physical machined enclosures:
- **Outer Shell**: `rounded-[2rem] p-1.5 bg-black/5 dark:bg-white/[0.04] ring-1 ring-black/5 dark:ring-white/10` with soft ambient shadow.
- **Inner Core**: `rounded-[calc(2rem-0.375rem)] bg-card text-card-foreground shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] p-6`.

### B. Nested CTA & "Island" Buttons
- Primary buttons are pill-shaped (`rounded-full`) with generous padding (`px-6 py-2.5`).
- Trailing action icons (`↗`, `→`) never sit naked next to text. They must be wrapped in a nested circular island (`size-6 rounded-full bg-white/20 dark:bg-white/15 flex items-center justify-center ml-2`).
- On hover, the nested island icon executes an independent diagonal kinetic translation (`group-hover:translate-x-0.5 group-hover:-translate-y-0.5`).

### C. Apple Segmented Controls & Pills
- Segmented tab containers use recessed frosted glass pills (`rounded-full bg-muted/50 p-1 border border-white/[0.08] backdrop-blur-sm`).
- Active triggers feature a subtle raised white/dark core with crisp borders and soft drop shadows.

### D. Inputs & Form Fields
- Labels sit cleanly above the field, helper text optional, error text inline below in red-400.
- Inputs feature recessed subtle backgrounds (`bg-muted/30 hover:bg-muted/50`), `rounded-xl` corners, and an accent focus ring (`focus-visible:ring-1 focus-visible:ring-primary/80`).

### E. Loaders & Empty States
- Generic circular spinners are banned in content areas. All data loading states utilize skeletal shimmer placeholders matching the exact geometry of the incoming cards and tables.
- Empty states are composed operational setups with explicit primary action buttons and instructions.

---

## 5. Layout & Responsive Principles
- **Grid-First Architecture**: CSS Grid is used for multi-column layouts; no fragile flexbox percentage calculations.
- **Macro-Whitespace**: Landing page sections breathe with substantial vertical padding (`py-24` to `py-32`). Dashboard uses balanced gutters (`space-y-6`).
- **Strict Mobile Collapse (< 768px)**:
  - Multi-column bento grids and master-detail split views aggressively collapse to a clean single column (`grid-cols-1`, `w-full`, `px-4`).
  - No horizontal scrolling or overflow under any circumstances.
- **Dynamic Viewport Height**: Full-height sections use `min-h-[100dvh]` to eliminate mobile Safari layout jumping (never `h-screen`).
- **Container Constraints**: Maximum width constraint of `1280px` (`max-w-7xl`) centered with auto margins.

---

## 6. Motion & Interaction Engine
- **Spring Physics**: Critically damped spring curves (`cubic-bezier(0.25, 1, 0.35, 1)` and `cubic-bezier(0.23, 1, 0.32, 1)`). No linear or generic `ease` transitions.
- **Tactile Push Feedback**: Universal button and clickable element pointer-down press (`active:scale-[0.97]` over `120ms`).
- **Staggered Waterfall Reveal**: Dynamic lists and card groups enter with 30ms staggered delays rather than mounting simultaneously.
- **Performance Guardrails**:
  - Animations are strictly hardware-accelerated, modifying only `transform` and `opacity`. Animating `top`, `left`, `width`, or `height` is strictly prohibited.
  - `backdrop-blur` is restricted to fixed navigation chrome and modal scrims; never applied to scrolling containers.
- **Accessibility Fallbacks**:
  - `@media (prefers-reduced-motion: reduce)`: disables transforms and spring transitions.
  - `@media (prefers-reduced-transparency: reduce)`: replaces glass blurs with solid opaque surfaces.

---

## 7. Anti-Patterns (Strictly Forbidden AI Tells)
1. **No Emojis**: Do not use emojis in UI headings, stat cards, or status indicators. Use precise, curated Lucide icons.
2. **No `Inter` Font**: The platform uses Geist and Geist Mono exclusively.
3. **No Pure Black (`#000000`)**: Always use off-black obsidian (`#09090b` / `oklch(0.12 0.005 285)`).
4. **No Neon Outer Glows**: No oversaturated purple/cyan neon halos or glowing borders.
5. **No AI Copywriting Clichés**: Strictly banned terms: *"Elevate"*, *"Seamless"*, *"Unleash"*, *"Next-Gen"*, *"Game-changer"*, *"Tapestry"*, *"In the world of..."*. Use direct, plain, technical language.
6. **No Fake Round Numbers**: No fictitious `99.99%`, `50%`, or `$100.00`. Use organic, messy operational figures (`87.4%`, `₹4,250`, `184 check-ins`).
7. **No 3-Equal-Columns AI Grid**: Replace generic 3-column rows with asymmetric bento layouts, 2-column zig-zag, or master-detail splits.
8. **No Symmetrical Padding**: Section padding must be optical; bottom padding often slightly exceeds top padding.
9. **No Floating Unaligned Buttons**: All CTAs in card groups must be pinned flush at the bottom.
10. **No Dead Anchor Links**: Real actions or disabled visual states only.
