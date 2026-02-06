# Frontend Development Rules

## Commands

```bash
cd frontend
npm run dev      # Start dev server (port 5173)
npm run build    # TypeScript compile + Vite build
npm run lint     # Run ESLint
```

## Routing Structure

All repository routes follow the pattern `/:owner/:repo/*` and use a shared `RepositoryLayout` component:

```
/:owner/:repo                    → RepositoryLayout + RepositoryDetail
/:owner/:repo/commits            → RepositoryLayout + RepositoryCommitsContent
/:owner/:repo/pulls              → RepositoryLayout + PullRequestList
/:owner/:repo/pull/:number       → RepositoryLayout + PullRequestDetail
/:owner/:repo/issues             → RepositoryLayout + IssueList
/:owner/:repo/issues/:number     → RepositoryLayout + IssueDetail
/:owner/:repo/releases           → RepositoryLayout + ReleaseList
/:owner/:repo/releases/tag/:tag  → RepositoryLayout + ReleaseDetail
```

**RepositoryLayout** provides:
- Repository header with clone URL
- Navigation tabs (Code, Commits, Pulls, Issues, Releases)
- Nested routes via React Router `<Outlet />`

## State Management

Use **TanStack Query (React Query)** for all server state and API calls.

**Patterns:**
- Services in `frontend/src/services/` define API client functions
- Query keys follow pattern: `['entity-type', id, ...params]`
- Use `useQuery` for fetching, `useMutation` for updates

**Example:**
```typescript
const { data: repo } = useQuery({
  queryKey: ['repository', owner, repoName],
  queryFn: () => repoService.getRepository(owner, repoName)
});
```

## Styling

- **Tailwind CSS** for styling
- **CSS Variables** for theming (see `index.css`)
- **Dark mode is DEFAULT** - Users must explicitly choose light mode

## Dark Mode Implementation

**CRITICAL**: The app initializes with dark mode unless the user explicitly chose light mode.

See `App.tsx`:
```typescript
useEffect(() => {
  const savedTheme = localStorage.getItem('theme');
  // Dark mode is default
  if (savedTheme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
  }
}, []);
```

## API Integration

- **API Base URL**: Configured via Vite environment variable from Aspire
- **No CORS issues**: Vite dev server proxies API calls to backend
- **Error Handling**: Use TanStack Query's built-in error handling with `retry: 1`

## Key Files

- `frontend/src/App.tsx` - Router configuration and theme initialization
- `frontend/src/services/repoService.ts` - Primary API client
- `frontend/src/components/layout/Header.tsx` - Global navigation and theme toggle
