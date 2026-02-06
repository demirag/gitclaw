---
name: pr-ready
description: Pre-pull request checklist to ensure code quality and completeness. Use before creating a PR or when you want to validate your changes.
disable-model-invocation: true
---

# Pull Request Readiness Checklist

Ensure your changes are ready for review before creating a PR.

## 1. Run the Test Suite

**CRITICAL**: Always run tests before creating a PR.

```bash
./scripts/test/test-gitclaw.sh
```

**Requirements**:
- Backend must be running (`cd backend/GitClaw.AppHost && dotnet run`)
- All 87 tests should pass
- Check `test-results-TIMESTAMP.md` for detailed results

## 2. Frontend Checks

```bash
cd frontend

# Run linter
npm run lint

# Build to catch TypeScript errors
npm run build
```

**Fix any**:
- ESLint errors
- TypeScript compilation errors
- Build warnings

## 3. Backend Checks

```bash
cd backend

# Build all projects
dotnet build

# Optional: Run with warnings as errors
dotnet build /warnaserror
```

## 4. Code Quality Review

### Architecture Compliance

- [ ] New services have interfaces in `GitClaw.Core/Interfaces/`
- [ ] Implementations are in `GitClaw.Data/`
- [ ] Controllers inject interfaces, not concrete classes
- [ ] No business logic in controllers

### Git Operations

- [ ] LibGit2Sharp operations wrapped in `Task.Run()`
- [ ] Repository objects disposed with `using`
- [ ] Empty repo checks before accessing `repo.Head.Tip`
- [ ] LINQ queries materialized before disposing Repository

### Database

- [ ] Migrations created and applied
- [ ] Migration names are descriptive
- [ ] Foreign key relationships configured properly
- [ ] No pending model changes

### Frontend

- [ ] Uses TanStack Query for data fetching
- [ ] Routes follow existing patterns
- [ ] Uses CSS variables for theming
- [ ] Responsive design (mobile/tablet/desktop)

### Testing

- [ ] New endpoints added to `scripts/test/test-gitclaw.sh`
- [ ] Test cases cover success and error scenarios
- [ ] Edge cases considered (empty data, unauthorized access)

## 5. Git Hygiene

```bash
# Check status
git status

# Review your changes
git diff

# Check branch
git branch --show-current
```

**Verify**:
- [ ] On correct feature branch (not `main`)
- [ ] No unintended files staged (`.env`, credentials, temp files)
- [ ] Commit messages are descriptive
- [ ] No merge conflicts

## 6. Documentation

- [ ] Updated relevant files in `.claude/rules/` if patterns changed
- [ ] Updated README.md if user-facing features added
- [ ] Added comments for non-obvious code
- [ ] API documentation in controller XML comments

## 7. Security Review

- [ ] No hardcoded credentials or API keys
- [ ] No sensitive data in logs
- [ ] Input validation on user-provided data
- [ ] SQL injection prevention (using parameterized queries)
- [ ] XSS prevention (proper escaping in frontend)

## 8. Create the Pull Request

If all checks pass:

```bash
# Push your branch
git push -u origin your-branch-name

# Create PR using GitHub CLI
gh pr create --title "Your PR Title" --body "Description"
```

Or use the GitHub web interface.

## PR Template

Use this template for your PR description:

```markdown
## Summary
Brief description of changes

## Changes
- Added/Updated/Fixed X
- Modified Y to Z
- Removed obsolete code in W

## Testing
- Ran `./scripts/test/test-gitclaw.sh` - all tests pass
- Manually tested: [describe manual testing]

## Screenshots (if applicable)
[Add screenshots for UI changes]

## Checklist
- [ ] Tests pass
- [ ] Frontend builds without errors
- [ ] Backend builds without warnings
- [ ] Architecture patterns followed
- [ ] Documentation updated
```

## Quick Commands Summary

```bash
# Test everything
./scripts/test/test-gitclaw.sh

# Lint and build frontend
cd frontend && npm run lint && npm run build

# Build backend
cd backend && dotnet build

# Create PR
git push -u origin your-branch && gh pr create
```

## Architecture References

- @.claude/rules/backend.md
- @.claude/rules/frontend.md
- @.claude/rules/database.md
- @.claude/rules/git-operations.md
- @.claude/rules/testing.md
