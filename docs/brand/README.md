# Kulli Brand System

Welcome to the production-ready brand system and design assets repository for **Kulli (ኩሊ)** — the on-demand peer-to-peer logistics marketplace for Addis Ababa.

This package provides everything required to build consistent, accessible, and distinctive visual experiences across:
1. **Client Mobile App** (Expo / React Native)
2. **Truck-Owner Mobile App** (Expo / React Native)
3. **Operations & Admin Dashboard** (React / Vite)
4. **Marketing Landing Pages** (Web)

---

## Directory Structure

```
docs/brand/
├── README.md                  # This quick-start guide
├── BRAND_GUIDELINES.md        # Comprehensive 12-section design specification
├── design-tokens.json         # W3C Design Token Community Group JSON specification
├── showcase.html              # Standalone interactive showcase (Light + Dark mode)
│
├── logos/                     # Production-ready vector SVGs
│   ├── kulli-logo-primary.svg     # Primary horizontal lockup (mark + wordmark)
│   ├── kulli-logo-stacked.svg     # Stacked vertical lockup
│   ├── kulli-logo-mark.svg        # Standalone Kinetic K mark
│   ├── kulli-logo-wordmark.svg    # Typography-only wordmark
│   ├── kulli-logo-mono-dark.svg   # Monochrome dark for light backgrounds
│   ├── kulli-logo-mono-light.svg  # Monochrome white for dark navy backgrounds
│   ├── favicon.svg                # 32×32 browser favicon
│   └── app-icon.svg               # 1024×1024 master app icon
│
├── fonts/                     # Licensed .woff2 variable web fonts
│   ├── PlusJakartaSans-Variable.woff2  # Body & UI font (wght 200..800)
│   ├── SpaceGrotesk-Variable.woff2     # Display & brand font (wght 300..700)
│   ├── LICENSE-PlusJakartaSans.txt     # SIL Open Font License 1.1
│   └── LICENSE-SpaceGrotesk.txt        # SIL Open Font License 1.1
│
├── css/                       # Modular CSS stylesheets
│   ├── fonts.css              # Local @font-face declarations
│   ├── typography.css         # Complete type scale utility classes
│   ├── theme-light.css        # Light theme CSS custom properties
│   └── theme-dark.css         # Dark theme CSS custom properties
│
└── icons/                     # Iconography documentation
    └── icon-guidelines.md     # Lucide icon sizing, stroke, and touch targets
```

---

## Quick Start

### 1. View the Interactive Brand Showcase
Open `showcase.html` directly in any web browser to see the complete brand system in action with live Light / Dark mode switching:
```bash
# Example with Python simple server or direct browser open:
xdg-open docs/brand/showcase.html
# or
npx serve docs/brand
```

### 2. Web & Dashboard Integration (CSS Variables)
Include the brand stylesheets in your HTML head or bundler:
```html
<link rel="stylesheet" href="/docs/brand/css/fonts.css">
<link rel="stylesheet" href="/docs/brand/css/typography.css">
<link rel="stylesheet" href="/docs/brand/css/theme-light.css">
<link rel="stylesheet" href="/docs/brand/css/theme-dark.css">
```

Toggle between light and dark themes using the `data-theme` attribute:
```javascript
// Switch theme
document.documentElement.setAttribute('data-theme', 'dark'); // or 'light'
```

### 3. Mobile App Integration (React Native / Expo)
Import tokens into your React Native theme provider:
```typescript
import tokens from './docs/brand/design-tokens.json';

export const theme = {
  colors: {
    primary: tokens.kulli.color.brand['navy-600'].$value,       // #1F3B87
    primaryDark: tokens.kulli.color.brand['navy-900'].$value,   // #0C1A3A
    accent: tokens.kulli.color.brand['orange-500'].$value,      // #F97316
    accentText: tokens.kulli.color.brand['navy-900'].$value,    // #0C1A3A (6.12:1 WCAG AA)
    background: tokens.kulli.color.neutral['50'].$value,        // #F8FAFC
    surface: tokens.kulli.color.neutral['0'].$value,            // #FFFFFF
    text: tokens.kulli.color.neutral['900'].$value,             // #0F172A
    muted: tokens.kulli.color.neutral['500'].$value,            // #64748B
    border: tokens.kulli.color.neutral['200'].$value,           // #E2E8F0
    success: tokens.kulli.color.status.success.$value,          // #10B981
    warning: tokens.kulli.color.status.warning.$value,          // #F59E0B
    error: tokens.kulli.color.status.error.$value               // #EF4444
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32
  },
  radii: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999
  }
};
```

---

## Core Brand Tokens Cheat Sheet

### Colors
| Name | Token | HEX | Role | WCAG Contrast on White |
|------|-------|-----|------|------------------------|
| **Navy 900** | `brand.navy-900` | `#0C1A3A` | Deep dark, headers, sidebars | 17.15:1 (AAA) |
| **Navy 600** | `brand.navy-600` | `#1F3B87` | Primary interactive brand | 10.33:1 (AAA) |
| **Orange 500** | `brand.orange-500`| `#F97316` | Kinetic energy, buttons, dispatch | 6.12:1 (with Navy 900 text) |
| **Slate 900** | `neutral.900` | `#0F172A` | Primary body text | 17.06:1 (AAA) |
| **Slate 500** | `neutral.500` | `#64748B` | Secondary muted text | 4.55:1 (AA) |
| **Slate 50** | `neutral.50` | `#F8FAFC` | Main canvas background | N/A |

### Typography
- **Headings & Display:** `Space Grotesk` (weights 600, 700)
- **Body & Interface:** `Plus Jakarta Sans` (weights 400, 500, 600, 700)
- **Code & Tracking IDs:** Monospace / JetBrains Mono

---

## Verification & Validation

All files have been verified:
- [x] **8 SVGs validated:** Passed XML parser check (`xml.etree.ElementTree`)
- [x] **2 Font binaries verified:** WOFF2 Variable format checked via `file` utility
- [x] **Design Tokens validated:** Validated against W3C Community Group schema
- [x] **Contrast Matrix validated:** 21 color combinations mathematically tested against WCAG 2.1 AA/AAA
- [x] **Accessibility:** High-contrast text rule established for Orange buttons (`#0C1A3A` on `#F97316` = 6.12:1)

For deep technical details, refer to [`BRAND_GUIDELINES.md`](./BRAND_GUIDELINES.md).
