# Kulli Brand System

Welcome to the brand system and design assets repository for **Kulli (ኩሊ)** — the on-demand logistics and cargo transportation platform.

This brand documentation provides the authentic, production-ready visual foundation across:
1. **Marketing Landing Pages** (`apps/landing`)
2. **Customer Mobile App** (Expo / React Native)
3. **Truck-Owner Mobile App** (Expo / React Native)
4. **Operations & Admin Dashboard** (React / Vite)

---

## Directory Structure

```
docs/brand/
├── README.md                  # Brand quick-start guide
├── BRAND_GUIDELINES.md        # Complete visual identity and usage specifications
├── design-tokens.json         # W3C standard JSON design tokens
├── showcase.html              # Standalone visual showcase
│
├── logos/                     # Production vector SVGs
│   ├── kulli-logo-primary.svg     # Primary horizontal lockup (truck + wordmark)
│   ├── kulli-logo-stacked.svg     # Stacked centered lockup
│   ├── kulli-logo-mark.svg        # Standalone Delivery Truck mark
│   ├── kulli-logo-wordmark.svg    # Standalone KULLI wordmark (Orange K + Navy ULLI)
│   ├── kulli-logo-mono-dark.svg   # Monochrome dark version (single-ink dark)
│   ├── kulli-logo-mono-light.svg  # Monochrome white version (reversed)
│   ├── favicon.svg                # 32×32 browser favicon
│   └── app-icon.svg               # Mobile app icon (squircle base)
│
├── fonts/                     # Licensed variable web fonts & offline fallbacks
│   ├── PlusJakartaSans-Variable.woff2
│   ├── SpaceGrotesk-Variable.woff2
│   ├── LICENSE-PlusJakartaSans.txt
│   └── LICENSE-SpaceGrotesk.txt
│
├── css/                       # Modular CSS stylesheets
│   ├── fonts.css              # Local font declarations & offline fallbacks
│   ├── typography.css         # Authentic typography classes & scales
│   ├── theme-light.css        # Core light theme CSS custom properties
│   └── theme-dark.css         # Single unified light palette (dark mode disabled)
│
└── icons/                     # Iconography documentation
    └── icon-guidelines.md     # Stroke, sizing, and touch target rules
```

---

## Core Brand Identity

### The Authentic Logo System
- **Delivery Truck Mark:** The iconic delivery truck silhouette in Royal Navy Blue (`#1F3B87`) carrying a Sky Blue parcel (`#77ACF1`).
- **Wordmark (`KULLI`):** Geometric uppercase sans in `Urbanist` (weight 800, letter-spacing `0.25em`). The initial letter **`K`** is highlighted in **Warm Amber Orange (`#FFAD61`)**, while **`ULLI`** is set in **Royal Navy Blue (`#1F3B87`)**.

### Color Palette
| Color Name | Token | HEX | Role |
|------------|-------|-----|------|
| **Royal Navy Blue** | `--color-primary` | `#1F3B87` | Primary brand blue, headers, logos, primary links |
| **Midnight Navy** | `--color-navy-dark` | `#142553` | Primary button background, dark text, footers |
| **Warm Amber Orange** | `--color-orange` | `#FFAD61` | Initial 'K' accent, secondary button hover, highlights |
| **Cargo Sky Blue** | `--color-sky-blue` | `#77ACF1` | Truck parcel fill, status badges |
| **Powder Blue** | `--color-powder-blue` | `#B0E0E6` | Subtle badge backgrounds, soft borders |
| **Page Background** | `--color-background` | `#FBFAF9` | Warm off-white base canvas |
| **Surface White** | `--color-surface` | `#FFFFFF` | Cards, navbar, dialog containers |
| **Neutral Dark** | `--color-text-primary` | `#191818` | Primary body typography (15.2:1 contrast) |

### Design Philosophy
- **Crisp & Light:** Clean white and warm off-white surfaces (`#FFFFFF` and `#FBFAF9`). No dark mode and no glowing neon artifacts.
- **Pill Buttons:** Primary buttons in Midnight Navy (`#142553`) and secondary buttons in white with navy border transitioning to Warm Orange hover (`#FFAD61`), with rounded 24px-32px pill radii.
- **Readable Typography:** Geometric pairing of `Urbanist` for brand/body and `Lexend` for UI controls and headings.

---

## Web Integration

```html
<!-- Include Kulli CSS in <head> -->
<link rel="stylesheet" href="/docs/brand/css/fonts.css">
<link rel="stylesheet" href="/docs/brand/css/typography.css">
<link rel="stylesheet" href="/docs/brand/css/theme-light.css">
```

### Brand Logo Lockup Example
```html
<div class="home-logo">
  <img src="/docs/brand/logos/kulli-logo-mark.svg" alt="Kulli Truck" width="28" height="28">
  <span class="brandName">
    <span class="brand-accent-k">K</span>ulli
  </span>
</div>
```

---

## Verification & Status
- [x] All 8 SVGs validated with strict XML parser and headless Chrome rasterizer.
- [x] CSS tokens aligned directly with authentic `guide/Kulli` specification.
- [x] Dark mode disabled in favor of unified, accessible light theme.
- [x] Full visual showcase available at `docs/brand/showcase.html`.
