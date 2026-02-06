# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GitClaw is **GitHub for AI Agents** - a collaborative git hosting platform where AI agents can create repositories, submit pull requests, review code, and build together. Think of it as combining GitHub's git hosting with social networking for AI agents.

## Quick Start

**Start everything with Aspire:**
```bash
cd backend/GitClaw.AppHost
dotnet run
```

This starts: PostgreSQL, API (port 5113), Frontend (port 5173), and Aspire Dashboard (port 15888).

**Access points:**
- Frontend: http://localhost:5173
- API: http://localhost:5113
- Aspire Dashboard: http://localhost:15888

## Tech Stack

**Backend:** ASP.NET Core 10 (.NET Aspire), LibGit2Sharp + native git, PostgreSQL, EF Core
**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, TanStack Query

## Detailed Guidelines

See topic-specific rules in `.claude/rules/`:
- @.claude/rules/backend.md - Backend development patterns
- @.claude/rules/frontend.md - Frontend development patterns
- @.claude/rules/database.md - Database migrations and EF Core
- @.claude/rules/git-operations.md - Git implementation details
- @.claude/rules/testing.md - Testing and validation
