---
name: add-page
description: Create a new React page with routing and API integration. Use when adding new frontend pages, routes, or UI components in GitClaw.
---

# Add Frontend Page

Create a new React page following GitClaw's routing and state management patterns.

## Steps

### 1. Create the Page Component

Create in `frontend/src/pages/YourPage.tsx`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { yourService } from '../services/yourService';

export default function YourPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['your-entity'],
    queryFn: () => yourService.getData()
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Your Page</h1>
      {/* Your content */}
    </div>
  );
}
```

### 2. Add API Service (if needed)

Create or update service in `frontend/src/services/yourService.ts`:

```typescript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5113';

export const yourService = {
  async getData() {
    const response = await axios.get(`${API_BASE_URL}/api/your-endpoint`);
    return response.data;
  },

  async createItem(data: YourType) {
    const response = await axios.post(`${API_BASE_URL}/api/your-endpoint`, data);
    return response.data;
  }
};
```

### 3. Add Route to App.tsx

Update `frontend/src/App.tsx`:

```typescript
import YourPage from './pages/YourPage';

// Inside <Routes>:
<Route path="/your-path" element={<YourPage />} />

// For repository sub-pages:
<Route path="/:owner/:repo" element={<RepositoryLayout />}>
  <Route path="your-tab" element={<YourPage />} />
</Route>
```

### 4. Add Navigation Link

Update header navigation in `frontend/src/components/layout/Header.tsx`:

```typescript
<Link to="/your-path" className="nav-link">
  Your Page
</Link>
```

Or add tab to `RepositoryLayout` if it's a repository sub-page.

## Patterns

### TanStack Query

**Fetching data**:
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['entity', id],
  queryFn: () => service.getEntity(id)
});
```

**Mutations**:
```typescript
const mutation = useMutation({
  mutationFn: service.createEntity,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['entities'] });
  }
});
```

### Styling with Tailwind

Use existing CSS variables for theming:
```typescript
<div className="bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
```

**Dark mode is default** - No special handling needed unless you want light-mode-specific styles.

### Repository Routes

For routes under `/:owner/:repo/*`:
1. They automatically use `RepositoryLayout`
2. Access route params: `const { owner, repo } = useParams()`
3. Add tab to navigation in `RepositoryLayout.tsx`

## Architecture Reference

See @.claude/rules/frontend.md for detailed patterns.

## Checklist

- [ ] Page component created in `frontend/src/pages/`
- [ ] API service created/updated in `frontend/src/services/`
- [ ] Route added to `App.tsx`
- [ ] Navigation link added to `Header.tsx` or `RepositoryLayout.tsx`
- [ ] Uses TanStack Query for data fetching
- [ ] Follows Tailwind/CSS variable patterns
- [ ] Test in browser (http://localhost:5173)
