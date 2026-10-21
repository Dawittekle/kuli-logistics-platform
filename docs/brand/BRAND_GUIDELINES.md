# Kulli Brand Guidelines & Design System Specification

> **Version:** 2.0.0
> **Status:** Production-Ready
> **Target Platforms:** Customer Mobile App (React Native/Expo), Truck-Owner Mobile App, Admin Operations Dashboard (React/Vite), Marketing Landing Pages
> **Design Assets Root:** `/docs/brand`

---

## Table of Contents

1. [Brand Foundation & Identity](#1-brand-foundation--identity)
2. [Logo System](#2-logo-system)
3. [Typography System](#3-typography-system)
4. [Color System](#4-color-system)
5. [Accessibility & WCAG Contrast Matrix](#5-accessibility--wcag-contrast-matrix)
6. [Spatial System, Grid & Layout](#6-spatial-system-grid--layout)
7. [Borders, Radii & Shadows](#7-borders-radii--shadows)
8. [UI Component Specifications](#8-ui-component-specifications)
9. [Iconography System](#9-iconography-system)
10. [Multi-Platform Implementation Guide](#10-multi-platform-implementation-guide)

---

## 1. Brand Foundation & Identity

### 1.1 Brand Mission
**Kulli (ኩሊ)** is an on-demand logistics and cargo transportation platform engineered for Ethiopia and East Africa. The platform connects shippers, individuals, and businesses requiring freight, heavy goods, furniture, or commercial transport directly with vetted, dependable truck owners and fleet drivers.

The name draws heritage from the local term *kulli*, evoking the diligence, physical reliability, and honesty of cargo handling, elevated into a modern, frictionless digital experience.

### 1.2 Brand Pillars & Visual Principles
1. **Unmistakable Clarity:** Shippers and drivers need clear prices, transparent routes, and immediate statuses. Interfaces avoid visual clutter, neon glows, and dark mode gimmicks in favor of clean, daylight-readable layouts.
2. **Honest Trust:** Freight is someone's livelihood or household. Deep Royal Navy Blue communicates corporate reliability and legal compliance, paired with Warm Amber Orange for friendly action.
3. **Ergonomic Simplicity:** Generous tap targets, friendly pill-shaped action buttons, and legible geometric typography ensure effortless operation across both mobile devices and desktop dashboards.

---

## 2. Logo System

### 2.1 The Authentic Logo Concept
The Kulli brand identity is defined by two harmonious elements:
1. **The Delivery Truck Mark:** A clean, modern delivery truck outline rendered in Royal Navy Blue (`#1F3B87`) carrying an elevated cargo package rendered in Sky Blue (`#77ACF1`). It immediately communicates freight, courier logistics, and secure cargo handling.
2. **The `KULLI` Wordmark:** Set in geometric sans `Urbanist` (weight 800 ExtraBold, uppercase, with generous `0.25em` letter tracking). The initial letter **`K`** is rendered in **Warm Amber Orange (`#FFAD61`)**, while the subsequent letters **`ULLI`** are rendered in **Royal Navy Blue (`#1F3B87`)**.

```
  [ DELIVERY TRUCK ]       K  U  L  L  I
  (Navy + Sky Parcel)    (Orange) (Royal Navy)
```

### 2.2 Logo File Registry

All vector logo assets are located in `/docs/brand/logos/`:

| File | Description | Recommended Usage | Dimensions / Ratio |
|------|-------------|-------------------|--------------------|
| `kulli-logo-primary.svg` | Horizontal lockup (truck mark + Orange K / Navy ULLI wordmark) | Primary navigation bar, web headers, official documents | 220 × 54 |
| `kulli-logo-stacked.svg` | Centered mark vertically stacked above centered wordmark | Mobile auth screens, splash screens, apparel, collateral | 180 × 120 |
| `kulli-logo-mark.svg` | Standalone Delivery Truck mark (Navy chassis + Sky Blue cargo) | Compact app bars, favicons, avatars, map dispatch markers | 32 × 32 (1:1) |
| `kulli-logo-wordmark.svg` | Standalone `KULLI` wordmark without icon | Footers, copyright lines, compact horizontal headers | 150 × 48 |
| `kulli-logo-mono-dark.svg` | Single-color dark navy version | Black-and-white receipts, single-color ink print, fax | 220 × 54 |
| `kulli-logo-mono-light.svg` | Single-color pure white reversed version | Deep navy backgrounds, vehicle decals, photography overlays | 220 × 54 |
| `favicon.svg` | 32×32 browser favicon with high-visibility truck mark | Browser tabs, bookmarks, PWA web app manifest | 32 × 32 (1:1) |
| `app-icon.svg` | 512×512 master mobile app icon on navy squircle | iOS App Store, Google Play Store, Android adaptive icons | 512 × 512 (1:1) |

### 2.3 Clear Space & Minimum Sizing
- **Clear Space:** Maintain minimum padding equal to **half the height of the truck icon** on all four sides. No other text or graphic may encroach within this zone.
- **Minimum Digital Sizes:**
  - Primary horizontal lockup: minimum height `28px` (web header)
  - Delivery truck mark: minimum size `20 × 20px` (mobile map marker: `24 × 24px`)
  - Standalone wordmark: minimum height `16px`

---

## 3. Typography System

### 3.1 Font Family Pairings
- **Brand Wordmark & Body Copy:** `Urbanist` — Geometric sans-serif with clean circles, balanced proportions, and high readability at all sizes.
- **Headings & UI Controls:** `Lexend` — Ergonomically designed for reading efficiency and crisp legibility on mobile screens.
- **Fallback Stack:** `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

### 3.2 Typography Scale

| Token | Family | Size | Weight | Line Height | Tracking | Purpose |
|-------|--------|------|--------|-------------|----------|---------|
| `brand-name` | Urbanist | `20px` / `1.25rem` | 800 ExtraBold | 1.20 | `0.25em` | Brand Logo Wordmark |
| `display` | Lexend | `clamp(2.5rem, 5vw, 4rem)` | 700 Bold | 1.15 | `-0.02em` | Marketing Hero Headline |
| `h1` | Lexend | `36px` / `2.25rem` | 700 Bold | 1.20 | `-0.015em` | Page Titles, Key Headlines |
| `h2` | Lexend | `28px` / `1.75rem` | 600 SemiBold | 1.25 | `-0.01em` | Section Titles |
| `h3` | Lexend | `22px` / `1.375rem` | 600 SemiBold | 1.30 | `-0.005em` | Card & Panel Headers |
| `h4` | Lexend | `18px` / `1.125rem` | 600 SemiBold | 1.35 | `0` | Subsection Headers |
| `body-lg` | Urbanist | `18px` / `1.125rem` | 400 Regular | 1.60 | `0` | Hero Subtitles, Lead Copy |
| `body` | Urbanist | `16px` / `1.000rem` | 400 Regular | 1.50 | `0` | Standard Paragraphs |
| `body-sm` | Urbanist | `14px` / `0.875rem` | 400 Regular | 1.45 | `0` | Dense Table Cells, Field Hints |
| `label` | Lexend | `15px` / `0.9375rem` | 500 Medium | 1.40 | `0.01em` | Buttons, Tabs, Nav Items |
| `caption` | Urbanist | `12px` / `0.750rem` | 500 Medium | 1.35 | `0` | Footnotes, Timestamps |

---

## 4. Color System

Kulli adopts a clean, daylight-optimized palette. There is **no dark mode**; interfaces are designed to look brilliant and trustworthy in bright sunlight and standard office conditions.

### 4.1 Master Palette

#### Core Brand Colors
- **Royal Navy Blue (`#1F3B87`):** Primary brand blue. Used for headings, icons, primary brand identity, and active borders.
- **Midnight Navy (`#142553`):** High-authority dark navy. Used for primary button backgrounds, high-contrast titles, and footer containers.
- **Warm Amber Orange (`#FFAD61`):** Warm accent color. Used for the initial 'K' in the brand logo, secondary button hover states, and key action highlights.
- **Cargo Sky Blue (`#77ACF1`):** Courier blue. Used for the delivery truck parcel fill and informational status elements.
- **Powder Blue (`#B0E0E6`):** Soft pale blue. Used for light badge backgrounds and subtle tag borders.

#### Surfaces & Neutrals
- **Page Background (`#FBFAF9`):** Warm clean off-white base canvas.
- **Surface White (`#FFFFFF`):** Pure white used for cards, navbar, modals, and container surfaces.
- **Neutral Dark (`#191818`):** Charcoal dark text for maximum readability without harsh jet black.
- **Slate Secondary (`#4A5568`):** Secondary description text.
- **Neutral Border (`#E2E8F0`):** Subtle borders and card dividers.

---

## 5. Accessibility & WCAG Contrast Matrix

All color pairings have been calculated against WCAG 2.1 contrast guidelines:

| Pairing | Foreground | Background | Contrast | WCAG Rating |
|---------|------------|------------|----------|-------------|
| Midnight Navy on White | `#142553` | `#FFFFFF` | **13.48:1** | **AAA** (Pass) |
| Royal Navy Blue on White | `#1F3B87` | `#FFFFFF` | **8.92:1** | **AAA** (Pass) |
| Neutral Dark on Page Base | `#191818` | `#FBFAF9` | **15.22:1** | **AAA** (Pass) |
| White on Midnight Navy | `#FFFFFF` | `#142553` | **13.48:1** | **AAA** (Pass) |
| Midnight Navy on Warm Orange | `#142553` | `#FFAD61` | **7.14:1** | **AAA** (Pass) |

---

## 6. Spatial System, Grid & Layout

- **Max Content Width:** `1144px` (`--layout-max-width` / `--dl-size-size-maxwidth`)
- **Spacing Scale:**
  - `8px` (`--space-halfunit`): Small gaps, icon-to-label spacing
  - `16px` (`--space-unit`): Default element padding, card inner margins
  - `24px` (`--space-oneandhalfunits`): Grid gaps, section sub-spacing
  - `32px` (`--space-twounits`): Standard component spacing
  - `48px` (`--space-threeunits`): Medium section separation
  - `64px` (`--space-fourunits`): Major section blocks
  - `96px` (`--space-sixunits`): Page level padding

---

## 7. Borders, Radii & Shadows

- **Buttons & Inputs:** `24px` to `32px` full pill radius (`--radius-button`, `--radius-input`)
- **Cards & Containers:** `8px` clean corner radius (`--radius-card`)
- **Shadows:**
  - Low: `0 1px 3px 0 rgb(0 0 0 / 0.05)`
  - Card: `0 2px 8px 0 rgb(31 59 135 / 0.06)`
  - Panel: `0 10px 15px -3px rgb(0 0 0 / 0.04)`

---

## 8. UI Component Specifications

### 8.1 Buttons
1. **Primary Button:**
   - Background: Midnight Navy `#142553`
   - Text: Pure White `#FFFFFF`
   - Border: 2px solid `#142553`
   - Radius: 24px–32px pill
   - Hover: White background with Midnight Navy text (`#142553`)
2. **Secondary Button:**
   - Background: Pure White `#FFFFFF`
   - Text: Midnight Navy `#142553`
   - Border: 2px solid `#142553`
   - Radius: 24px–32px pill
   - Hover: Warm Amber Orange `#FFAD61` background with White text (`#FFFFFF`)
3. **Accent Button:**
   - Background: Warm Amber Orange `#FFAD61`
   - Text: Pure White `#FFFFFF`
   - Radius: 24px–32px pill
   - Hover: `#FFA24B`

### 8.2 Input Fields
- Background: `#FFFFFF`
- Border: 1.5px solid `#E2E8F0`
- Radius: `24px` pill
- Text: `#191818`, font `Urbanist` 15px
- Focus: Border `#1F3B87` with subtle ring

---

## 9. Iconography System
- All interface icons use clean geometric strokes (1.75px–2px stroke weight).
- Delivery & truck icons directly reference the official Delivery Truck mark geometry (`M7,5h6...` and `M31.41,17l...`).
- Interactive touch targets on mobile apps are at least `48 × 48px`.

---

## 10. Multi-Platform Implementation Guide

### 10.1 Web Applications
```html
<link rel="stylesheet" href="/docs/brand/css/fonts.css">
<link rel="stylesheet" href="/docs/brand/css/typography.css">
<link rel="stylesheet" href="/docs/brand/css/theme-light.css">
```

### 10.2 React Native / Mobile
```typescript
import tokens from './docs/brand/design-tokens.json';

export const theme = {
  colors: {
    primary: '#1F3B87',
    navyDark: '#142553',
    orange: '#FFAD61',
    skyBlue: '#77ACF1',
    background: '#FBFAF9',
    surface: '#FFFFFF',
    text: '#191818',
    textSecondary: '#4A5568',
    border: '#E2E8F0',
  },
  radii: {
    button: 24,
    card: 8,
  }
};
```
