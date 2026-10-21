# Kulli Icon Guidelines

## Icon Library

Kulli uses [Lucide](https://lucide.dev) as its icon system. Lucide provides a clean, consistent set of open-source icons already integrated into the admin dashboard and component library.

> **Do not** mix icon libraries. All icons across Kulli products must come from Lucide to maintain visual consistency.

---

## Size Scale

| Token      | Size   | Usage                                           |
| ---------- | ------ | ----------------------------------------------- |
| `x-small`  | 16 px  | Inline indicators, badges, dense tables         |
| `small`    | 20 px  | Secondary actions, compact UI, breadcrumbs       |
| `default`  | 24 px  | Buttons, navigation items, form fields           |
| `medium`   | 32 px  | Section headers, empty-state illustrations       |
| `large`    | 48 px  | Hero illustrations, onboarding, feature callouts |

Always use these fixed sizes — avoid arbitrary scaling.

---

## Stroke Width

- **Default stroke:** 2 px at the 24 px reference size.
- Scale stroke proportionally when using non-default sizes:

| Icon Size | Stroke Width |
| --------- | ------------ |
| 16 px     | 1.5 px       |
| 20 px     | 1.75 px      |
| 24 px     | 2 px         |
| 32 px     | 2 px         |
| 48 px     | 2.5 px       |

> Lucide's `strokeWidth` prop (or CSS `stroke-width`) can be used to adjust this in code.

---

## Color

Icons **inherit** their color from the parent element's `color` property by default.

```css
.icon {
  color: currentColor;
}
```

- **Do not** hard-code icon colors unless the icon is a status indicator (use semantic status colors: `--color-success`, `--color-warning`, `--color-error`, `--color-info`).
- For disabled states, use `--color-text-placeholder` with `opacity: 0.6`.

---

## Touch & Click Targets

All interactive icons must meet a **minimum 44 × 44 px** touch target, regardless of visual icon size.

```css
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: var(--space-2); /* 8px */
}
```

This applies to icon-only buttons, icon links, and interactive toolbar items.

---

## Alignment

- **Optically center** icons — do not rely on the bounding box alone.
- Some icons (e.g., play ▶, chevron-right) appear visually off-center when mathematically centered. Nudge by 1–2 px to achieve optical balance.
- When pairing with text, use `align-items: center` on the flex container, and fine-tune with small vertical offsets if needed.

---

## Filled vs. Outline

| Style     | When to Use                                                             |
| --------- | ----------------------------------------------------------------------- |
| **Outline** (default) | Standard UI chrome — navigation, toolbars, form elements, actions |
| **Filled** | Active/selected states, bottom navigation active tab, favorite/bookmarked |

**Rules:**
1. Default to **outline** for all icons.
2. Use **filled** only to communicate a *toggled-on* or *selected* state (e.g., a filled star for "favorited").
3. Never mix filled and outline icons in the same icon group unless indicating state.

---

## Icon + Text Pairing

When an icon accompanies a label:

| Property    | Value                        |
| ----------- | ---------------------------- |
| **Gap**     | `var(--space-2)` (8 px)      |
| **Alignment** | Vertically centered (`align-items: center`) |
| **Order**   | Icon before text (LTR); icon after text for trailing actions |
| **Size**    | Match the text's cap-height — typically `small` (20 px) for body text |

```css
.icon-text {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
```

- For buttons, use the `default` (24 px) icon size with body text.
- For captions/labels, use `x-small` (16 px) or `small` (20 px).
- Icon and text should share the same `color` value.

---

## Accessibility

- **Decorative icons** (next to visible text): set `aria-hidden="true"` and omit `alt`/`title`.
- **Standalone icons** (icon-only buttons): provide an accessible label via `aria-label` on the button, or use a visually-hidden `<span>`.
- Never rely on an icon alone to convey critical meaning — always pair with text or an accessible label.

---

## Reference

- Icon browser and search: [https://lucide.dev](https://lucide.dev)
- React package: `lucide-react`
- Vue package: `lucide-vue-next`
- SVG sprites: `lucide-static`
