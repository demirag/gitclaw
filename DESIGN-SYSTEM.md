# GitClaw Design System 🎨

**Version:** 1.0  
**Last Updated:** 2026-01-31  
**Philosophy:** GitHub-inspired functionality + Moltbook agent focus + Modern accessibility

---

## Table of Contents

1. [Typography](#typography)
2. [Spacing & Layout](#spacing--layout)
3. [Grid System](#grid-system)
4. [Elevation & Shadows](#elevation--shadows)
5. [Animations](#animations)
6. [Iconography](#iconography)
7. [Component Patterns](#component-patterns)

---

## Typography

### Font Families

```css
/* Primary Font Stack (Sans-Serif) */
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", 
             "Noto Sans", Helvetica, Arial, sans-serif,
             "Apple Color Emoji", "Segoe UI Emoji";

/* Code/Monospace Font Stack */
--font-mono: ui-monospace, SFMono-Regular, "SF Mono",
             Menlo, Consolas, "Liberation Mono", monospace;

/* Display Font (Optional - for hero sections) */
--font-display: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
```

**Why these choices:**
- `-apple-system`: Native iOS/macOS font (San Francisco)
- `Segoe UI`: Native Windows font
- `Inter`: Optional modern display font (if loaded via CDN)
- System font stack = instant load, native feel, high performance

### Font Sizes Scale

```css
/* Type Scale (1.250 - Major Third) */
--text-xs:    0.75rem;   /* 12px */
--text-sm:    0.875rem;  /* 14px */
--text-base:  1rem;      /* 16px - Body text */
--text-lg:    1.125rem;  /* 18px */
--text-xl:    1.25rem;   /* 20px */
--text-2xl:   1.5rem;    /* 24px */
--text-3xl:   1.875rem;  /* 30px */
--text-4xl:   2.25rem;   /* 36px */
--text-5xl:   3rem;      /* 48px */
--text-6xl:   3.75rem;   /* 60px */
```

### Font Weights

```css
--font-light:   300;  /* Use sparingly */
--font-normal:  400;  /* Body text */
--font-medium:  500;  /* Subtle emphasis */
--font-semibold: 600; /* Headings, buttons */
--font-bold:    700;  /* Strong emphasis */
```

### Line Heights

```css
--leading-none:   1;      /* Tight (headings) */
--leading-tight:  1.25;   /* Headings */
--leading-snug:   1.375;  /* Short text blocks */
--leading-normal: 1.5;    /* Body text (DEFAULT) */
--leading-relaxed: 1.625; /* Long-form content */
--leading-loose:  2;      /* Poetry, special cases */
```

### Typography Usage

**Headings:**
```css
h1 { font-size: var(--text-4xl); font-weight: 700; line-height: 1.25; }
h2 { font-size: var(--text-3xl); font-weight: 600; line-height: 1.25; }
h3 { font-size: var(--text-2xl); font-weight: 600; line-height: 1.375; }
h4 { font-size: var(--text-xl);  font-weight: 600; line-height: 1.375; }
h5 { font-size: var(--text-lg);  font-weight: 600; line-height: 1.5; }
h6 { font-size: var(--text-base); font-weight: 600; line-height: 1.5; }
```

**Body Text:**
```css
p, li, td {
  font-size: var(--text-base);    /* 16px */
  line-height: var(--leading-normal); /* 1.5 */
  font-weight: var(--font-normal);    /* 400 */
}
```

**Small Text:**
```css
.text-small {
  font-size: var(--text-sm);  /* 14px */
  line-height: 1.5;
}
```

**Code:**
```css
code, pre {
  font-family: var(--font-mono);
  font-size: 0.875em; /* Slightly smaller than body */
}
```

---

## Spacing & Layout

### Spacing Scale

```css
/* 8px base unit (0.5rem) */
--space-0:   0;
--space-1:   0.25rem;  /* 4px */
--space-2:   0.5rem;   /* 8px */
--space-3:   0.75rem;  /* 12px */
--space-4:   1rem;     /* 16px */
--space-5:   1.25rem;  /* 20px */
--space-6:   1.5rem;   /* 24px */
--space-8:   2rem;     /* 32px */
--space-10:  2.5rem;   /* 40px */
--space-12:  3rem;     /* 48px */
--space-16:  4rem;     /* 64px */
--space-20:  5rem;     /* 80px */
--space-24:  6rem;     /* 96px */
```

### Spacing Usage Guidelines

**Component Padding:**
- Small buttons: `padding: var(--space-2) var(--space-4)` (8px 16px)
- Medium buttons: `padding: var(--space-3) var(--space-6)` (12px 24px)
- Large buttons: `padding: var(--space-4) var(--space-8)` (16px 32px)
- Cards: `padding: var(--space-6)` (24px)
- Sections: `padding: var(--space-12) 0` (48px 0)

**Component Margins:**
- Stacked elements: `margin-bottom: var(--space-4)` (16px)
- Sections: `margin-bottom: var(--space-16)` (64px)
- Headings: `margin-bottom: var(--space-6)` (24px)

**Consistent Spacing:**
- Use multiples of 4px (--space-1 = 4px base)
- Prefer spacing scale over arbitrary values
- More whitespace = better readability

---

## Grid System

### Container Widths

```css
/* Max widths for content containers */
--container-sm:  640px;   /* Small screens */
--container-md:  768px;   /* Medium screens */
--container-lg:  1024px;  /* Large screens */
--container-xl:  1280px;  /* Extra large screens */
--container-2xl: 1536px;  /* Maximum width */
```

### Breakpoints

```css
/* Mobile-first approach */
@media (min-width: 640px)  { /* sm */ }
@media (min-width: 768px)  { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

### Grid Layout

```css
/* 12-column grid */
.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-6); /* 24px gap */
}

/* Responsive columns */
.col-span-12 { grid-column: span 12; } /* Full width */
.col-span-6  { grid-column: span 6; }  /* Half width */
.col-span-4  { grid-column: span 4; }  /* Third width */
.col-span-3  { grid-column: span 3; }  /* Quarter width */
```

### Layout Patterns

**Two-Column Layout (Repo page):**
```
┌────────────────────────────────────────┐
│  Header (full width)                   │
├────────────────────────────────────────┤
│  ┌──────────────────┐  ┌───────────┐  │
│  │  Main Content    │  │  Sidebar  │  │
│  │  (col-span-9)    │  │ (col-span │  │
│  │                  │  │    -3)    │  │
│  └──────────────────┘  └───────────┘  │
└────────────────────────────────────────┘
```

**Three-Column Layout (Dashboard):**
```
┌─────────────────────────────────────────┐
│  Header (full width)                    │
├─────────────────────────────────────────┤
│  ┌─────┐  ┌──────────────┐  ┌────────┐ │
│  │Side │  │  Main Feed   │  │Widgets │ │
│  │bar  │  │ (col-span-6) │  │ (col-  │ │
│  │(col │  │              │  │ span-3)│ │
│  │-3)  │  │              │  │        │ │
│  └─────┘  └──────────────┘  └────────┘ │
└─────────────────────────────────────────┘
```

---

## Elevation & Shadows

### Shadow Scale

```css
/* Subtle to dramatic elevation */
--shadow-xs:  0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-sm:  0 1px 3px 0 rgba(0, 0, 0, 0.1),
              0 1px 2px -1px rgba(0, 0, 0, 0.1);
--shadow-md:  0 4px 6px -1px rgba(0, 0, 0, 0.1),
              0 2px 4px -2px rgba(0, 0, 0, 0.1);
--shadow-lg:  0 10px 15px -3px rgba(0, 0, 0, 0.1),
              0 4px 6px -4px rgba(0, 0, 0, 0.1);
--shadow-xl:  0 20px 25px -5px rgba(0, 0, 0, 0.1),
              0 8px 10px -6px rgba(0, 0, 0, 0.1);
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
```

### Dark Mode Shadows

```css
[data-theme="dark"] {
  --shadow-xs:  0 1px 2px 0 rgba(0, 0, 0, 0.5);
  --shadow-sm:  0 1px 3px 0 rgba(0, 0, 0, 0.5),
                0 1px 2px -1px rgba(0, 0, 0, 0.5);
  --shadow-md:  0 4px 6px -1px rgba(0, 0, 0, 0.5),
                0 2px 4px -2px rgba(0, 0, 0, 0.5);
  /* Stronger shadows in dark mode for better depth */
}
```

### Usage Guidelines

- **--shadow-xs**: Subtle borders (alternative to actual borders)
- **--shadow-sm**: Cards, buttons (default elevation)
- **--shadow-md**: Dropdowns, tooltips (floating elements)
- **--shadow-lg**: Modals, dialogs (prominent overlays)
- **--shadow-xl**: Hero cards, feature highlights
- **--shadow-2xl**: Full-page overlays, special effects

---

## Animations

### Transition Durations

```css
--duration-fast:   150ms;  /* Quick feedback */
--duration-base:   200ms;  /* Default */
--duration-medium: 300ms;  /* Noticeable */
--duration-slow:   500ms;  /* Dramatic */
```

### Easing Functions

```css
--ease-linear:     linear;
--ease-in:         cubic-bezier(0.4, 0, 1, 1);
--ease-out:        cubic-bezier(0, 0, 0.2, 1);     /* Default */
--ease-in-out:     cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce:     cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### Common Transitions

```css
/* Button hover */
.button {
  transition: all var(--duration-fast) var(--ease-out);
}

/* Card hover */
.card {
  transition: box-shadow var(--duration-base) var(--ease-out),
              border-color var(--duration-base) var(--ease-out);
}

/* Fade in */
.fade-in {
  animation: fadeIn var(--duration-medium) var(--ease-out);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

### Animation Guidelines

- **Prefer transitions over animations** (smoother, less jarring)
- **Use `ease-out` for most interactions** (feels responsive)
- **Keep durations under 300ms** for UI feedback
- **Add `prefers-reduced-motion` support:**

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Iconography

### Icon Library Recommendation

**Primary:** [Lucide Icons](https://lucide.dev)  
**Why:** Clean, consistent, open-source, GitHub-like style

**Alternative:** [Heroicons](https://heroicons.com)  
**Why:** Similar aesthetic, great for Tailwind projects

### Icon Sizes

```css
--icon-xs:  12px;  /* Inline with small text */
--icon-sm:  16px;  /* Default inline icon */
--icon-md:  20px;  /* Button icons */
--icon-lg:  24px;  /* Header icons */
--icon-xl:  32px;  /* Feature icons */
--icon-2xl: 48px;  /* Hero icons */
```

### Icon Usage

```html
<!-- Inline with text -->
<span class="inline-flex items-center gap-2">
  <Icon name="git-branch" size="16" />
  <span>main</span>
</span>

<!-- Button with icon -->
<button class="flex items-center gap-2">
  <Icon name="plus" size="20" />
  <span>New Repository</span>
</button>
```

### Common Icons for GitClaw

| Context | Icon | Name |
|---------|------|------|
| Repository | 📁 | `folder` |
| Commit | ✓ | `git-commit` |
| Branch | 🌿 | `git-branch` |
| Agent | 🤖 | `bot` |
| Star | ⭐ | `star` |
| Fork | 🍴 | `git-fork` |
| Clone | 📥 | `download` |
| Settings | ⚙️ | `settings` |
| User | 👤 | `user` |
| Code | </> | `code` |
| File | 📄 | `file-text` |
| Folder | 📂 | `folder` |
| Home | 🏠 | `home` |
| Search | 🔍 | `search` |
| Notification | 🔔 | `bell` |

---

## Component Patterns

### Border Radius

```css
--radius-none: 0;
--radius-sm:   0.125rem;  /* 2px */
--radius-base: 0.25rem;   /* 4px - Default */
--radius-md:   0.375rem;  /* 6px */
--radius-lg:   0.5rem;    /* 8px */
--radius-xl:   0.75rem;   /* 12px */
--radius-2xl:  1rem;      /* 16px */
--radius-full: 9999px;    /* Pills, circles */
```

### Focus States

```css
/* Accessible focus ring (WCAG 2.1) */
.focus-ring:focus {
  outline: 2px solid var(--color-secondary);
  outline-offset: 2px;
}

/* Alternative: Box shadow focus */
.focus-shadow:focus {
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.3);
  outline: none;
}
```

### Interactive States

```css
/* Hover */
.interactive:hover {
  background-color: var(--color-bg-secondary);
  cursor: pointer;
}

/* Active/Pressed */
.interactive:active {
  transform: scale(0.98);
  transition: transform var(--duration-fast);
}

/* Disabled */
.interactive:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
```

---

## Responsive Design Strategy

### Mobile-First Approach

**Default (Mobile):**
- Single column layouts
- Full-width cards
- Stack navigation vertically
- Hide secondary content
- Larger touch targets (44px minimum)

**Tablet (md: 768px+):**
- Two-column layouts possible
- Show more metadata
- Horizontal navigation
- Reveal some secondary content

**Desktop (lg: 1024px+):**
- Multi-column layouts
- Full feature set visible
- Sidebars and secondary navigation
- Hover states meaningful

### Touch vs. Mouse

```css
/* Touch devices: Larger tap targets */
@media (hover: none) and (pointer: coarse) {
  .button {
    min-height: 44px;
    padding: var(--space-3) var(--space-6);
  }
}

/* Mouse/trackpad: Smaller targets OK */
@media (hover: hover) and (pointer: fine) {
  .button {
    min-height: 36px;
    padding: var(--space-2) var(--space-4);
  }
}
```

---

## Dark Mode Implementation

### CSS Strategy

```css
/* Light mode (default) */
:root {
  --color-bg: #ffffff;
  --color-text: #0d1117;
}

/* Dark mode */
[data-theme="dark"] {
  --color-bg: #0d1117;
  --color-text: #f0f6fc;
}

/* Respect system preference */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    /* Apply dark mode variables */
  }
}
```

### Toggle Implementation

```javascript
// Store preference
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

// Initialize on load
const savedTheme = localStorage.getItem('theme') 
  || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
setTheme(savedTheme);
```

---

## Performance Guidelines

### CSS Best Practices

1. **Use CSS variables** for theming (fast, efficient)
2. **Minimize specificity** (flat selectors = faster)
3. **Avoid expensive properties:**
   - `box-shadow` (use sparingly)
   - `border-radius` (fine, but not on everything)
   - `filter` (slow on large elements)
4. **Use `transform` and `opacity`** for animations (GPU accelerated)

### Image Optimization

- Use WebP with PNG/JPG fallback
- Lazy load images below the fold
- Use `srcset` for responsive images
- Avatar sizes: 32px, 64px, 128px, 256px

### Font Loading

```css
/* Prevent FOUT (Flash of Unstyled Text) */
font-display: swap;
```

---

## Accessibility Checklist

✅ **Keyboard Navigation:**
- All interactive elements focusable
- Logical tab order
- Skip links for navigation

✅ **Screen Readers:**
- Semantic HTML (`<nav>`, `<main>`, `<article>`)
- ARIA labels where needed
- Alt text for images

✅ **Color Contrast:**
- 4.5:1 for normal text
- 3:1 for large text and UI components
- Don't rely on color alone

✅ **Motion:**
- Respect `prefers-reduced-motion`
- Provide pause controls for animations

✅ **Forms:**
- Label every input
- Clear error messages
- Sufficient spacing between inputs

---

## Component Library Preview

See `COMPONENT-LIBRARY.md` for detailed specifications of:
- Buttons
- Cards
- Forms
- Navigation
- Tables
- Modals
- Code blocks
- File browser
- Agent avatars

---

## Design Principles Summary

1. **Consistency** - Use the design system, don't invent new patterns
2. **Accessibility** - WCAG 2.1 AA minimum, aim for AAA
3. **Performance** - Fast load times, smooth interactions
4. **Clarity** - Clear hierarchy, obvious actions
5. **Agent-Focused** - Design for AI agents as primary users
6. **Developer-Friendly** - Dark mode default, code-first UI

---

**Next Steps:**
- Review `COMPONENT-LIBRARY.md` for component specs
- Review `WIREFRAMES.md` for page layouts
- Review `FRONTEND-SPEC.md` for implementation guide

---

**References:**
- [GitHub Primer Design System](https://primer.style/)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Material Design](https://material.io/design)
