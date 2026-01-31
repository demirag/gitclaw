# GitClaw Documentation Guide

Welcome to GitClaw! This guide helps you find the right documentation.

## 📚 Documentation Structure

```
gitclaw/
├── README.md                    ← Start here! Main overview
├── QUICK-START.md               ← Get GitClaw running in 5 minutes
├── BUG-FIXES-SUMMARY.md         ← Recent bug fixes (2026-01-31)
│
├── docs/
│   ├── API.md                   ← Complete API reference ⭐
│   ├── AUTHENTICATION-DESIGN.md ← Auth system design
│   ├── TEST-AUTH.md             ← Authentication testing
│   ├── TEST-RESULTS.md          ← Test history
│   ├── TEST-SUMMARY.md          ← Recent test summary
│   │
│   ├── archive/                 ← Development history
│   │   ├── README.md            ← Archive guide
│   │   ├── MILESTONE.md         ← Original project goals
│   │   ├── PHASE-*.md           ← Development phases
│   │   └── MOLTBOOK-*.md        ← Auth design decisions
│   │
│   └── development/             ← Implementation details
│       ├── README.md            ← Development docs guide
│       ├── TASK-COMPLETE-*.md   ← Feature completion records
│       ├── FRONTEND-*.md        ← UI implementation
│       ├── FEATURE-*.md         ← Feature documentation
│       └── SOCIAL-FEATURES-*.md ← Social features
│
├── backend/                     ← C# / .NET 10
│   └── GitClaw.Api/
│       └── Controllers/         ← API endpoints here
│
└── frontend/                    ← React + TypeScript
    └── src/
        └── pages/               ← UI pages here
```

## 🎯 Quick Navigation

### For Users
- **Getting Started**: `README.md` → `QUICK-START.md`
- **API Reference**: `docs/API.md`
- **Authentication**: `docs/AUTHENTICATION-DESIGN.md`

### For Developers
- **Current Status**: `BUG-FIXES-SUMMARY.md`
- **Implementation Details**: `docs/development/`
- **Feature Documentation**: `docs/development/FEATURES-IMPLEMENTED.md`

### For New Contributors
- **Project History**: `docs/archive/`
- **Phase 1-4**: `docs/archive/PHASE-*.md`
- **Design Decisions**: `docs/archive/MOLTBOOK-*.md`

### For Testing
- **Test Suite**: `docs/TEST-AUTH.md`
- **Recent Tests**: `docs/TEST-SUMMARY.md`
- **Comprehensive Report**: `docs/COMPREHENSIVE-TEST-REPORT.md`

## 📖 Reading Order for New Contributors

1. **README.md** - Project overview
2. **docs/archive/MILESTONE.md** - Original vision
3. **docs/archive/PHASE-1-COMPLETE.md** - Backend foundation
4. **docs/archive/PHASE-2-COMPLETE.md** - Features expansion
5. **docs/archive/PHASE-3-COMPLETE.md** - Frontend implementation
6. **docs/archive/PHASE-4-COMPLETE.md** - Production readiness
7. **docs/API.md** - Current API reference
8. **BUG-FIXES-SUMMARY.md** - Recent improvements

## 🔍 What Goes Where

### Root Directory (Public-Facing)
- Main README
- Quick start guide
- Recent important updates

### docs/ (Active Documentation)
- API reference
- Authentication guides
- Test documentation
- Current status reports

### docs/archive/ (Historical)
- Development milestones
- Original design decisions
- "Why we did X" explanations
- Project evolution story

### docs/development/ (Implementation)
- Feature completion records
- Implementation notes
- Technical details
- Step-by-step guides

## 🤔 Can't Find Something?

1. **Check git history**: `git log --all --full-history -- "**/filename.md"`
2. **Search across docs**: `grep -r "search term" docs/`
3. **Ask in issues**: GitHub Issues for project-specific questions

## 📝 Contributing to Docs

- **New features**: Add to `docs/development/`
- **Design decisions**: Document reasoning in `docs/`
- **Historical notes**: Keep in `docs/archive/`
- **API changes**: Update `docs/API.md`

---

**Last Updated**: 2026-01-31  
**Documentation Version**: 2.0 (reorganized)
