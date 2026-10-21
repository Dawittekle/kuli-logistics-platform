# Kulli Brand Guidelines & Design System Specification

> **Version:** 1.0.0  
> **Status:** Production-Ready  
> **Target Platforms:** Customer Mobile App (React Native/Expo), Truck-Owner Mobile App, Admin Operations Dashboard (React/Vite), Marketing Landing Pages  
> **Design Assets Root:** `/docs/brand`

---

## Table of Contents

1. [Brand Foundation & Identity](#1-brand-foundation--identity)
2. [Logo System](#2-logo-system)
3. [Typography System](#3-typography-system)
4. [Color System & Themes](#4-color-system--themes)
5. [Accessibility & WCAG Contrast Matrix](#5-accessibility--wcag-contrast-matrix)
6. [Spatial System, Grid & Layout](#6-spatial-system-grid--layout)
7. [Borders, Radii & Shadows](#7-borders-radii--shadows)
8. [UI Component Specifications](#8-ui-component-specifications)
9. [Iconography System](#9-iconography-system)
10. [Imagery & Illustration Direction](#10-imagery--illustration-direction)
11. [Motion & Interaction Principles](#11-motion--interaction-principles)
12. [Multi-Platform Implementation Guide](#12-multi-platform-implementation-guide)

---

## 1. Brand Foundation & Identity

### 1.1 Brand Mission & Context
Kulli (ኩሊ) is an on-demand, peer-to-peer logistics marketplace engineered specifically for Addis Ababa and broader East Africa. The platform connects individuals and businesses needing cargo, freight, furniture, and materials transport with verified, available truck owners and fleet operators.

The name draws heritage from the local term for moving and carrying cargo with diligence and physical reliability, elevated into a modern, frictionless digital ecosystem.

### 1.2 Brand Pillars & Tone of Voice
1. **Unshakeable Reliability:** Cargo is someone’s livelihood or home. Every interface element must radiate security, verified trust, and transparent pricing.
2. **Dynamic Momentum:** Logistics is movement. Forward-leaning angles, energetic orange accents, and responsive tactile animations reflect real-time dispatch and movement.
3. **Warm Human Approachability:** Moving is stressful. We reject sterile corporate gray in favor of welcoming geometric humanist curves, readable typography, and crystal-clear statuses.
4. **Locally Grounded, Globally Polished:** Rooted in the reality of Addis Ababa neighborhoods (Merkato, Bole, Saris, Kality) while meeting world-class design system engineering standards.

---

## 2. Logo System

### 2.1 The Concept: The Kinetic "K" Mark
Instead of a generic cartoon truck icon, Kulli's visual identity centers around a bespoke **Kinetic "K" Mark**:
- **Vertical Pillar:** Grounded left stem representing stability, vetted drivers, and rock-solid platform infrastructure.
- **Dynamic Forward Angle:** Tilted precisely at **2.5° forward**, capturing kinetic energy, forward transit, and on-time arrival.
- **Connector Gap:** An intentional spatial gap between the anchor stem and the diagonal arms, symbolizing the connection between origin and destination (pickup ↔ drop-off, sender ↔ driver).
- **Softened Terminals:** Rounded endpoints that humanize the geometric precision, maintaining warmth on small mobile screens.

```
       /
      /   <-- Upper arm: dispatch / onward journey
 |   /
 |  /
 | <--- Connector gap: matching pickup & drop-off
 |  \
 |   \
 |    \   <-- Lower arm: delivery / solid arrival
       \
```

### 2.2 Logo Variants & File Registry

All logo assets are saved in `/docs/brand/logos/` as scalable, optimized vector SVGs:

| File | Description | Recommended Usage | Dimensions / Ratio |
|------|-------------|-------------------|--------------------|
| `kulli-logo-primary.svg` | Horizontal lockup with orange K mark + orange/navy wordmark | Main navigation bar, website header, formal invoices | 240 × 64 (15:4) |
| `kulli-logo-stacked.svg` | Centered mark above centered wordmark | Splash screens, mobile auth headers, printed merchandise | 120 × 100 (6:5) |
| `kulli-logo-mark.svg` | Standalone Kinetic K mark | Social avatars, loading spinners, mobile app header icon | 64 × 64 (1:1) |
| `kulli-logo-wordmark.svg` | Typography-only wordmark | Compact headers, legal documents, footer credits | 200 × 48 (25:6) |
| `kulli-logo-mono-dark.svg` | Monochrome dark (#0C1A3A) horizontal lockup | Black-and-white printing, fax, single-color receipts | 240 × 64 (15:4) |
| `kulli-logo-mono-light.svg` | Monochrome pure white (#FFFFFF) horizontal lockup | Dark navy headers, vehicle decals, dark mode navigation | 240 × 64 (15:4) |
| `favicon.svg` | Deep navy rounded tile with high-visibility white K mark | Web browser tab favicon, PWA shortcut icons | 32 × 32 (1:1) |
| `app-icon.svg` | 1024 × 1024 master app icon with platform safe-zone margin | iOS App Store, Google Play Store, Android Adaptive Icon | 1024 × 1024 (1:1) |

### 2.3 Clear Space & Minimum Sizing
- **Clear Space:** Maintain minimum padding equal to **half the height of the K mark ($0.5\text{H}$)** on all four sides of any logo lockup. No other graphic element, text, or border may encroach into this perimeter.
- **Minimum Digital Sizes:**
  - `kulli-logo-primary.svg`: Minimum width `120px` (or `30pt` on iOS)
  - `kulli-logo-stacked.svg`: Minimum width `80px`
  - `kulli-logo-mark.svg`: Minimum display `20px × 20px`
  - `favicon.svg`: Rendered down to `16px × 16px`
- **Minimum Print Sizes:**
  - Primary Lockup: Minimum width `28mm`
  - Mark Only: Minimum width `7mm`

### 2.4 Logo Misuse Rules
- **Do not** stretch, condense, skew, or alter the 2.5° kinetic tilt.
- **Do not** replace the custom geometric wordmark with an unstyled system font.
- **Do not** apply drop shadows, 3D extrusions, or outer glows to the mark.
- **Do not** enclose the primary color logo inside an orange container where contrast drops below 4.5:1.
- **Do not** introduce secondary illustrations (truck silhouettes, parcel boxes) into the lockup perimeter.

---

## 3. Typography System

### 3.1 Type Evaluation & Final Selection

During repository exploration, the existing landing page loaded **9 Google Font families** (Urbanist, Lexend, Titillium Web, STIX Two Text, Noto Sans, Roboto, Roboto Mono, Roboto Serif, Roboto Condensed) while the mobile app fell back to system sans-serif.

We evaluated three top modern type candidates:
1. **Manrope:** Clean semi-grotesque, but visually indistinguishable from Inter and lacks unique brand signature.
2. **Urbanist:** Good geometric curves, but possesses thin stroke quirks at display sizes and lacks optical weights for dense dashboard data.
3. **Space Grotesk + Plus Jakarta Sans (Winning Pair):**
   - **Space Grotesk (Display & Brand):** Proportional tech-sans derived from Space Mono. Features distinctive geometric cuts and subtle mechanical character. Gives headlines, hero banners, and the "KULLI" wordmark an unmistakable technological edge.
   - **Plus Jakarta Sans (Body & UI):** Masterful geometric humanist typeface commissioned for modern digital interfaces. Boasts generous x-height, wide open apertures, distinct letterforms (curved terminal 'l', double-story 'a'), and superb legibility down to 11px captions on mobile screens.

### 3.2 Font Licensing & Asset Inventory
Both families are licensed under the **SIL Open Font License 1.1** (commercial use, bundling, and distribution permitted). Full license documents and woff2 binaries are stored in `/docs/brand/fonts/`.

| Family | File | Format | Weights / Axes | Source |
|--------|------|--------|----------------|--------|
| **Plus Jakarta Sans** | `PlusJakartaSans-Variable.woff2` | WOFF2 Variable | `wght 200..800` | Google Fonts / Tokotype |
| **Space Grotesk** | `SpaceGrotesk-Variable.woff2` | WOFF2 Variable | `wght 300..700` | Google Fonts / Florian Karsten |

### 3.3 Type Scale & Style Tokens

| Token | Family | Size (px / rem) | Weight | Line Height | Tracking | Purpose |
|-------|--------|-----------------|--------|-------------|----------|---------|
| `display` | Space Grotesk | `48–64px` / `3.0–4.0rem` | 700 Bold | 1.08 | `-0.025em` | Marketing Hero, Splash Titles |
| `h1` | Space Grotesk | `32px` / `2.0rem` | 700 Bold | 1.15 | `-0.02em` | App Screen Titles, Modal Headers |
| `h2` | Space Grotesk | `24px` / `1.5rem` | 600 SemiBold | 1.25 | `-0.015em` | Section Titles, Section Cards |
| `h3` | Plus Jakarta Sans | `20px` / `1.25rem` | 700 Bold | 1.30 | `-0.01em` | Panel Headers, Metric Groupings |
| `h4` | Plus Jakarta Sans | `17px` / `1.0625rem` | 700 Bold | 1.35 | `-0.005em` | List Item Titles, Card Subheaders |
| `body-lg`| Plus Jakarta Sans | `18px` / `1.125rem` | 400 Regular | 1.60 | `0` | Intro Paragraphs, Empty States |
| `body` | Plus Jakarta Sans | `16px` / `1.0rem` | 400 Regular | 1.50 | `0` | Default Paragraphs, Explanations |
| `body-sm`| Plus Jakarta Sans | `14px` / `0.875rem` | 400 Regular | 1.45 | `0` | Secondary Info, Table Data Cells |
| `label` | Plus Jakarta Sans | `14px` / `0.875rem` | 600 SemiBold | 1.00 | `+0.01em` | Button Text, Form Field Labels |
| `caption`| Plus Jakarta Sans | `12px` / `0.75rem` | 500 Medium | 1.35 | `0` | Metadata, Timestamp, Helpers |
| `overline`| Plus Jakarta Sans | `11px` / `0.6875rem` | 800 ExtraBold | 1.00 | `+0.10em` | Eyebrow Badges, Category Tags |

---

## 4. Color System & Themes

### 4.1 Master Palette

#### A. Brand Primary — Deep Kulli Navy
The core authority color. Conveys stability, legal compliance, and enterprise strength.
- `navy-900`: `#0C1A3A` — Deep navy canvas, sidebar gradient base, text header
- `navy-800`: `#142553` — Preserved legacy navy; modal & card header surface
- `navy-700`: `#1B3270` — Primary interactive brand dark
- `navy-600`: `#1F3B87` — Vibrant brand blue; interactive default
- `navy-500`: `#2D4EA0` — Secondary interactive accent
- `navy-400`: `#4A6AB8` — Hover & focus rings in dark mode
- `navy-300`: `#7B93CC` — Muted decorative strokes

#### B. Brand Accent — Kinetic Orange
The energetic pulse color. Highlights calls-to-action, in-transit status, truck arrivals, and live metrics.
- `orange-600`: `#EA580C` — Active/pressed button state, dark accent
- `orange-500`: `#F97316` — Primary kinetic accent (replaces muddy `#ff9d00`)
- `orange-400`: `#FB923C` — Hover state, dark mode accent
- `orange-300`: `#FDBA74` — Decorative accents & pills
- `orange-200`: `#FED7AA` — Light accent border
- `orange-100`: `#FFEDD5` — Light accent fill
- `orange-50`:  `#FFF7ED` — Subtle highlight tint background

#### C. Neutral Scale — Balanced Slate
Clean, blue-undertoned neutrals ensuring unity between mobile app and web dashboards.
- `slate-900`: `#0F172A` — Primary high-contrast text
- `slate-800`: `#1E293B` — Dark mode card background
- `slate-700`: `#334155` — Secondary body text
- `slate-600`: `#475569` — Medium muted text
- `slate-500`: `#64748B` — Placeholder text & icon stroke
- `slate-400`: `#94A3B8` — Disabled icons & borders
- `slate-300`: `#CBD5E1` — Strong input & card borders
- `slate-200`: `#E2E8F0` — Subtle dividing lines
- `slate-100`: `#F1F5F9` — Input backgrounds, secondary pills
- `slate-50`:  `#F8FAFC` — Primary canvas background
- `white`:     `#FFFFFF` — Card surfaces, high-contrast text on dark

#### D. Semantic Status Colors
- **Success (Green):** Base `#10B981`, Background `#ECFDF5`, Border `#A7F3D0`, Text `#065F46`
- **Warning (Amber):** Base `#F59E0B`, Background `#FFFBEB`, Border `#FDE68A`, Text `#92400E`
- **Error (Red):** Base `#EF4444`, Background `#FEF2F2`, Border `#FECACA`, Text `#991B1B`
- **Info (Blue):** Base `#3B82F6`, Background `#EFF6FF`, Border `#BFDBFE`, Text `#1E40AF`

---

## 5. Accessibility & WCAG Contrast Matrix

Every color combination in the Kulli design system has been mathematically verified against **WCAG 2.1 Level AA (minimum 4.5:1 for body text, 3.0:1 for large text)** and **Level AAA (7.0:1 for body text)** standards:

| Foreground | Background | Contrast Ratio | WCAG AA Normal | WCAG AA Large | WCAG AAA Normal | Implementation Rule |
|------------|------------|----------------|----------------|---------------|-----------------|---------------------|
| Navy 900 (`#0C1A3A`) | White (`#FFFFFF`) | **17.15 : 1** | PASS | PASS | PASS | Default primary titles & headers |
| Slate 900 (`#0F172A`) | Slate 50 (`#F8FAFC`) | **17.06 : 1** | PASS | PASS | PASS | Default primary body copy |
| Slate 700 (`#334155`) | Slate 50 (`#F8FAFC`) | **9.90 : 1** | PASS | PASS | PASS | Secondary labels & field descriptions |
| Slate 500 (`#64748B`) | Slate 50 (`#F8FAFC`) | **4.55 : 1** | PASS | PASS | FAIL | Muted captions & secondary badges |
| White (`#FFFFFF`) | Navy 900 (`#0C1A3A`) | **17.15 : 1** | PASS | PASS | PASS | Dark mode text, sidebar titles |
| White (`#FFFFFF`) | Navy 600 (`#1F3B87`) | **10.33 : 1** | PASS | PASS | PASS | Primary Navy CTA button text |
| Navy 900 (`#0C1A3A`) | Orange 500 (`#F97316`) | **6.12 : 1** | PASS | PASS | FAIL | **High-contrast text on Orange buttons** |
| Slate 900 (`#0F172A`) | Orange 500 (`#F97316`) | **6.37 : 1** | PASS | PASS | FAIL | **High-contrast text on Orange buttons** |
| Success Text (`#065F46`)| Success BG (`#ECFDF5`) | **7.29 : 1** | PASS | PASS | PASS | "Delivered", "Verified" badges |
| Warning Text (`#92400E`)| Warning BG (`#FFFBEB`) | **6.84 : 1** | PASS | PASS | FAIL | "Pending Match", "Under Review" badges |
| Error Text (`#991B1B`) | Error BG (`#FEF2F2`) | **7.60 : 1** | PASS | PASS | PASS | "Disputed", "Cancelled" badges |
| Info Text (`#1E40AF`)  | Info BG (`#EFF6FF`) | **8.01 : 1** | PASS | PASS | PASS | "En Route", "New Offer" badges |
| Dark Text (`#F1F5F9`)  | Dark BG (`#0B1120`) | **17.19 : 1** | PASS | PASS | PASS | Dark mode primary body text |
| Dark Muted (`#CBD5E1`) | Dark Surface (`#131B2E`) | **11.56 : 1** | PASS | PASS | PASS | Dark mode secondary text |
| Dark Accent (`#FB923C`)| Dark BG (`#0B1120`) | **8.32 : 1** | PASS | PASS | PASS | Dark mode accent links & highlights |

> [!IMPORTANT]
> **Critical Design Decision on Orange Buttons:** Pure white text on Orange 500 yields only **2.80:1** contrast (failing WCAG AA). Therefore, in the Kulli Design System, all text and icons positioned directly on an Orange 500 / 400 background **MUST use Navy 900 (`#0C1A3A`) or Slate 900 (`#0F172A`)**, ensuring an accessible **6.12:1 to 6.37:1** ratio.

---

## 6. Spatial System, Grid & Layout

### 6.1 Spacing Scale (4px Base Grid)
All padding, margin, gap, and layout dimensions must snap strictly to multiples of 4px:

```
--space-1:   4px   (0.25rem)  —  Micro gaps, badge padding vertical
--space-2:   8px   (0.50rem)  —  Tight gaps, input padding vertical
--space-3:  12px   (0.75rem)  —  Compact padding, list item gaps
--space-4:  16px   (1.00rem)  —  Standard component padding, card padding mobile
--space-5:  20px   (1.25rem)  —  Form row spacing, button horizontal padding
--space-6:  24px   (1.50rem)  —  Card padding desktop, section grid gaps
--space-8:  32px   (2.00rem)  —  Page margins mobile, panel inner padding
--space-10: 40px   (2.50rem)  —  Section sub-grouping
--space-12: 48px   (3.00rem)  —  Major section padding tablet
--space-16: 64px   (4.00rem)  —  Section vertical padding desktop
--space-20: 80px   (5.00rem)  —  Hero block vertical padding
--space-24: 96px   (6.00rem)  —  Landing page band separation
--space-32: 128px  (8.00rem)  —  Maximum layout spacer
```

### 6.2 Responsive Breakpoints & Container System
- **Breakpoint `sm` (`640px`):** Mobile devices landscape, small tablets
- **Breakpoint `md` (`768px`):** Standard tablets, foldables
- **Breakpoint `lg` (`1024px`):** Small laptops, dashboard sidebar collapse point
- **Breakpoint `xl` (`1280px`):** Standard desktop displays
- **Breakpoint `2xl` (`1440px`):** High-density monitors, full dashboard view
- **Max Content Container Width:** `1144px` (Preserved from existing landing page for maximum continuity)

---

## 7. Borders, Radii & Shadows

### 7.1 Corner Radius Scale
- `radius-sm` (`4px`): Form checkboxes, small status chips
- `radius-md` (`8px`): Form inputs, standard buttons, badge containers
- `radius-lg` (`12px`): Cards, notification banners, floating popovers
- `radius-xl` (`16px`): Modals, action sheets, map preview widgets
- `radius-2xl` (`20px`): Dashboard overview tiles, hero cards
- `radius-3xl` (`24px`): Feature cards, landing page showcase banners
- `radius-full` (`9999px`): Avatars, pill badges, floating action button (FAB)

### 7.2 Elevation & Shadow Architecture
Designed to create realistic spatial layering without dirty dark smudges:

```css
/* Ambient soft drop for flat elements */
--shadow-low: 0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05);

/* Standard interactive card rest state */
--shadow-medium: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);

/* Raised panels, floating drawers, active drag cards */
--shadow-panel: 0 10px 15px -3px rgb(0 0 0 / 0.04), 0 4px 6px -4px rgb(0 0 0 / 0.04);

/* Dropdown menus, modal dialogs, map route overlays */
--shadow-high: 0 20px 25px -5px rgb(0 0 0 / 0.06), 0 8px 10px -6px rgb(0 0 0 / 0.06);
```

In **Dark Mode**, shadow color transitions to `rgb(0 0 0 / 0.35)` to preserve depth against dark backgrounds.

---

## 8. UI Component Specifications

### 8.1 Buttons
- **Primary Navy Action (`.btn-primary`):** Background `#1F3B87`, Text `#FFFFFF`, Hover `#1B3270`, Active `#142553`.
- **Primary Accent Action (`.btn-accent`):** Background `#F97316`, Text `#0C1A3A` (accessible contrast 6.12:1), Hover `#FB923C`, Active `#EA580C`.
- **Secondary Outline (`.btn-outline`):** Border `1.5px solid #1F3B87`, Text `#1F3B87`, Hover background `rgba(31, 59, 135, 0.06)`.
- **Ghost Action (`.btn-ghost`):** Background transparent, Text `#334155`, Hover background `#F1F5F9`.
- **Danger Action (`.btn-danger`):** Background `#EF4444`, Text `#FFFFFF`, Hover `#DC2626`.
- **Dimensions:**
  - `sm`: Min height `36px`, padding `0 14px`, text `13px/600`
  - `md`: Min height `44px` (satisfies touch target minimum), padding `0 20px`, text `14px/600`
  - `lg`: Min height `54px`, padding `0 28px`, text `16px/700`

### 8.2 Form Inputs & Controls
- **Rest State:** Background `#FFFFFF`, Border `1.5px solid #CBD5E1`, Radius `8px`, Text `#0F172A`, Height `48px`.
- **Focus State:** Border `#1F3B87`, Outline none, Box-shadow `0 0 0 4px rgba(31, 59, 135, 0.12)`.
- **Error State:** Border `#EF4444`, Box-shadow `0 0 0 4px rgba(239, 68, 68, 0.12)`.
- **Disabled State:** Background `#F1F5F9`, Border `#E2E8F0`, Text `#94A3B8`, Cursor `not-allowed`.

### 8.3 Cards & Data Surfaces
- Background `#FFFFFF` (Dark mode: `#131B2E`)
- Border `1px solid #E2E8F0` (Dark mode: `#1E293B`)
- Border Radius `12px` or `16px`
- Shadow `--shadow-low` rising to `--shadow-medium` on hover if clickable
- Padding: `20px` mobile, `24px` desktop

### 8.4 Status Badges & Chips
- Structure: Rounded pill container (`radius-full`) with optional status dot (`6px` diameter).
- Heights: `26px` (compact) to `32px` (standard).
- Semantic mappings:
  - `draft`, `offline`: Neutral Slate (`#F1F5F9` / `#475569`)
  - `pending`, `under_review`, `in_progress`: Amber (`#FFFBEB` / `#92400E`)
  - `approved`, `completed`, `online`: Green (`#ECFDF5` / `#065F46`)
  - `rejected`, `disputed`, `cancelled`: Red (`#FEF2F2` / `#991B1B`)
  - `en_route_to_pickup`, `in_transit`: Blue (`#EFF6FF` / `#1E40AF`)

---

## 9. Iconography System

- **Standard Library:** [Lucide Icons](https://lucide.dev)
- **Stroke Width:** `2.0px` at `24px` viewport; `1.5px` at `16px` viewport.
- **Coloring:** Always inherit `currentColor` so icons respond automatically to parent text tone.
- **Touch Target:** Mandatory `44 × 44px` interactive envelope for any tappable icon button.
- **Icon Pairing:** When accompanied by text, spacing is fixed at `--space-2` (8px).

---

## 10. Imagery & Illustration Direction

### 10.1 Photography Style
- **Authenticity First:** Show real trucks (Isuzu NPRs, Bedford KB26s, flatbeds, cargo vans) operating in Addis Ababa streetscapes. Avoid hyper-polished European or North American tractor-trailers that do not match local operational reality.
- **Color Treatment:** Natural light, balanced warmth, slightly elevated saturation on orange safety vests and vehicle markings.
- **Border Treatment:** Photos embedded in cards must always carry matching border radii (`radius-lg` or `radius-xl`) with `overflow: hidden`.

### 10.2 Illustration & Map Previews
- **Map Vector Style:** Clean slate road grids with high-contrast transit paths.
- **Route Colors:**
  - Planned Route Line: Vibrant Kulli Navy `#1F3B87` or `#3B82F6` (Stroke 4–5px).
  - Pickup Pin: Green `#10B981` with inner "P".
  - Drop-off Pin: Orange `#F97316` with inner "D".
  - Live Truck Location: Kinetic Orange dot with subtle pulsating ring.

---

## 11. Motion & Interaction Principles

### 11.1 Motion Tokens
- `duration-fast` (`150ms`): Button press states, toggle switches, hover colors
- `duration-normal` (`200ms`): Tooltips, dropdown expansions, modal dismissals
- `duration-slow` (`300ms`): Screen slide transitions, accordion drawers
- `duration-slower` (`500ms`): Large route draw-in, hero banners

### 11.2 Easing Curves
- `ease-default`: `cubic-bezier(0.4, 0, 0.2, 1)` — Standard material deceleration
- `ease-spring`: `cubic-bezier(0.34, 1.56, 0.64, 1)` — Tactile spring on mobile button releases
- `ease-out`: `cubic-bezier(0, 0, 0.2, 1)` — Entrance animations

---

## 12. Multi-Platform Implementation Guide

### 12.1 Web & Admin Dashboard (Vite / CSS Variables)
Import the brand stylesheets in application entry point:
```html
<link rel="stylesheet" href="/docs/brand/css/fonts.css">
<link rel="stylesheet" href="/docs/brand/css/theme-light.css">
<link rel="stylesheet" href="/docs/brand/css/theme-dark.css">
<link rel="stylesheet" href="/docs/brand/css/typography.css">
```

Apply themes dynamically:
```javascript
document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
```

### 12.2 React Native Mobile Apps (Expo / TypeScript)
Map `design-tokens.json` directly into React Native StyleSheet themes:
```typescript
import tokens from './docs/brand/design-tokens.json';

export const brandTheme = {
  colors: {
    primary: tokens.kulli.color.brand['navy-600'].$value,
    primaryDark: tokens.kulli.color.brand['navy-900'].$value,
    accent: tokens.kulli.color.brand['orange-500'].$value,
    accentText: tokens.kulli.color.brand['navy-900'].$value, // AA compliant!
    background: tokens.kulli.color.neutral['50'].$value,
    surface: tokens.kulli.color.neutral['0'].$value,
    text: tokens.kulli.color.neutral['900'].$value,
    muted: tokens.kulli.color.neutral['500'].$value,
    border: tokens.kulli.color.neutral['200'].$value,
  },
  typography: {
    display: 'SpaceGrotesk-Bold',
    body: 'PlusJakartaSans-Regular',
    label: 'PlusJakartaSans-SemiBold',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radii: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  }
};
```

---

*This specification serves as the single source of truth for all Kulli digital properties. Questions, updates, or token extensions should follow the design token schema defined in `design-tokens.json`.*
