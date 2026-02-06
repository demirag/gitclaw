---
name: frontend-design
description: Guide frontend design patterns, component architecture, and UI/UX best practices for GitClaw. Use when designing UI components, discussing layout patterns, or creating frontend architectures.
---

# Frontend Design Guide

Guidelines for designing and implementing UI components in GitClaw.

## Design Principles

### 1. GitHub-Inspired UI

GitClaw follows GitHub's design language for familiarity:
- Clean, minimal interfaces
- Card-based layouts for content
- Consistent spacing and typography
- Clear visual hierarchy

### 2. Dark Mode First

**CRITICAL**: Dark mode is the DEFAULT theme.
- Design with dark backgrounds first
- Use CSS variables for theming: `var(--color-bg-primary)`, `var(--color-text-primary)`
- Test both themes, but optimize for dark

### 3. Agent-Centric Design

Remember: GitClaw is for **AI agents**, not just humans:
- Clear, structured layouts for easy parsing
- Consistent patterns for predictability
- Semantic HTML for accessibility
- RESTful patterns reflected in UI

## Component Architecture

### Page Structure Pattern

```typescript
export default function YourPage() {
  // 1. Data fetching with TanStack Query
  const { data, isLoading, error } = useQuery({
    queryKey: ['entity', id],
    queryFn: () => service.getData(id)
  });

  // 2. Loading state
  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  // 3. Error state
  if (error) {
    return <div className="container mx-auto px-4 py-8">Error: {error.message}</div>;
  }

  // 4. Main content
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Page Title</h1>
      {/* Content */}
    </div>
  );
}
```

### Repository-Scoped Pages

For pages under `/:owner/:repo/*`, use the `RepositoryLayout` pattern:

```typescript
// In App.tsx
<Route path="/:owner/:repo" element={<RepositoryLayout />}>
  <Route path="your-tab" element={<YourContent />} />
</Route>

// YourContent.tsx - will be rendered inside RepositoryLayout
export default function YourContent() {
  const { owner, repo } = useParams();
  // RepositoryLayout provides: header, clone URL, tabs
  return <div>{/* Your tab content */}</div>;
}
```

## Styling Patterns

### Container Layouts

```typescript
// Standard page container
<div className="container mx-auto px-4 py-8">

// Narrow content (forms, settings)
<div className="max-w-2xl mx-auto px-4 py-8">

// Wide content (tables, lists)
<div className="container mx-auto px-4 py-8 max-w-7xl">
```

### Card Components

```typescript
<div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-6">
  <h3 className="text-lg font-semibold mb-2">Card Title</h3>
  <p className="text-[var(--color-text-secondary)]">Content</p>
</div>
```

### Lists with Hover States

```typescript
<div className="space-y-2">
  {items.map(item => (
    <div
      key={item.id}
      className="p-4 border border-[var(--color-border)] rounded-lg
                 hover:bg-[var(--color-bg-tertiary)] transition-colors cursor-pointer"
    >
      {item.name}
    </div>
  ))}
</div>
```

### Buttons

```typescript
// Primary action
<button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
  Primary Action
</button>

// Secondary action
<button className="border border-[var(--color-border)] px-4 py-2 rounded-lg
                   hover:bg-[var(--color-bg-tertiary)]">
  Secondary Action
</button>

// Danger action
<button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg">
  Delete
</button>
```

## State Management Patterns

### Loading States

```typescript
if (isLoading) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  );
}
```

### Empty States

```typescript
if (data.length === 0) {
  return (
    <div className="text-center py-12">
      <p className="text-[var(--color-text-secondary)] mb-4">
        No items found
      </p>
      <button onClick={onCreate} className="bg-blue-500 text-white px-4 py-2 rounded-lg">
        Create First Item
      </button>
    </div>
  );
}
```

### Error Handling

```typescript
if (error) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                    rounded-lg p-4 mb-4">
      <p className="text-red-800 dark:text-red-200">
        {error.message || 'Something went wrong'}
      </p>
    </div>
  );
}
```

## Responsive Design

### Mobile-First Approach

```typescript
// Stack on mobile, side-by-side on desktop
<div className="flex flex-col md:flex-row gap-4">
  <div className="flex-1">Left content</div>
  <div className="flex-1">Right content</div>
</div>

// Hide on mobile, show on desktop
<div className="hidden md:block">Desktop only</div>

// Show on mobile, hide on desktop
<div className="block md:hidden">Mobile only</div>
```

### Responsive Containers

```typescript
// Full width on mobile, constrained on desktop
<div className="w-full md:max-w-4xl md:mx-auto px-4">
```

## Component Composition

### Extract Reusable Components

**When to extract**:
- Component is used in 3+ places
- Component has complex logic
- Component improves readability

**Where to put them**:
- Generic components: `src/components/common/`
- Layout components: `src/components/layout/`
- Feature-specific: `src/components/[feature]/`

### Example: Card Component

```typescript
// src/components/common/Card.tsx
export function Card({ title, children, className = '' }) {
  return (
    <div className={`bg-[var(--color-bg-secondary)] border border-[var(--color-border)]
                     rounded-lg p-6 ${className}`}>
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      {children}
    </div>
  );
}

// Usage
<Card title="Repository Stats">
  <p>Stars: {stars}</p>
</Card>
```

## Icons

GitClaw uses **Lucide React** for icons:

```typescript
import { Star, GitFork, Eye } from 'lucide-react';

<div className="flex items-center gap-2">
  <Star size={16} className="text-yellow-500" />
  <span>{starCount}</span>
</div>
```

## Performance

### Optimize Renders

```typescript
// Memoize expensive computations
const sortedItems = useMemo(() =>
  items.sort((a, b) => a.name.localeCompare(b.name)),
  [items]
);

// Memoize callbacks
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

### Lazy Load Routes

```typescript
// For large pages, use lazy loading
const HeavyPage = lazy(() => import('./pages/HeavyPage'));

<Route path="/heavy" element={
  <Suspense fallback={<div>Loading...</div>}>
    <HeavyPage />
  </Suspense>
} />
```

## Accessibility

### Semantic HTML

```typescript
// Use semantic elements
<nav>, <main>, <article>, <section>, <aside>

// Add ARIA labels where needed
<button aria-label="Close dialog">×</button>

// Use proper heading hierarchy
<h1> → <h2> → <h3> (don't skip levels)
```

### Keyboard Navigation

```typescript
// Make interactive elements keyboard accessible
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyPress={(e) => e.key === 'Enter' && handleClick()}
>
  Clickable div
</div>
```

## Design Checklist

- [ ] Follows GitHub-inspired design patterns
- [ ] Uses CSS variables for theming
- [ ] Dark mode is default and looks good
- [ ] Responsive (mobile, tablet, desktop)
- [ ] Loading states implemented
- [ ] Error states handled gracefully
- [ ] Empty states with clear CTAs
- [ ] Uses TanStack Query for data
- [ ] Proper semantic HTML
- [ ] Keyboard accessible
- [ ] Icons from Lucide React
- [ ] Consistent spacing (Tailwind scale: 2, 4, 6, 8)

## Architecture Reference

See @.claude/rules/frontend.md for detailed frontend patterns.

## Related Skills

- `/add-page` - Create new page following these patterns
- `/add-feature` - Full feature implementation including frontend
