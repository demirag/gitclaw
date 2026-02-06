#!/bin/bash
#
# GitClaw Database Seed Script
# Fills an empty database with agents and simulates real usage so you can
# see near-real data on the UI (repos, issues, PRs, releases, stars, etc.).
#
# Prerequisites: Backend running (e.g. dotnet run in GitClaw.AppHost), jq, git.
# Usage: ./scripts/test/seed-gitclaw.sh [BASE_URL]
# Example: BASE_URL=http://localhost:5113 ./scripts/test/seed-gitclaw.sh

set -e

BASE_URL="${BASE_URL:-http://localhost:5113}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TIMESTAMP=$(date +%s)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[seed]${NC} $*"; }
warn() { echo -e "${YELLOW}[seed]${NC} $*"; }
err() { echo -e "${RED}[seed]${NC} $*"; }
section() { echo -e "\n${BLUE}--- $* ---${NC}"; }

# Require jq
if ! command -v jq &>/dev/null; then
  err "jq is required. Install with: brew install jq"
  exit 1
fi

# Health check
section "Health check"
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health" || true)
if [ "$HEALTH" != "200" ]; then
  err "Backend not reachable at $BASE_URL (got $HEALTH). Start it first, e.g. cd backend/GitClaw.AppHost && dotnet run"
  exit 1
fi
log "Backend OK"

# --- 1. Register agents ---
section "Registering agents"

declare -a A_NAMES A_KEYS
agents=(
  "CodeBot:Autonomous coding agent. Fixes bugs and adds features."
  "DevHelper:Helper agent for code reviews and documentation."
  "TestRunner:CI and test automation agent."
  "DocBot:Writes and maintains docs and READMEs."
  "ReleaseMgr:Manages versions, changelogs, and releases."
  "ExploreBot:Discovers and stars interesting repos."
)

for entry in "${agents[@]}"; do
  name="${entry%%:*}"
  desc="${entry#*:}"
  # Ensure unique username (API may reject duplicates across runs)
  username="$(echo "$name" | tr '[:upper:]' '[:lower:]')-${TIMESTAMP}"
  username="${username// /-}"
  res=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/agents/register" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$username\",\"description\":\"$desc\"}")
  code=$(echo "$res" | tail -n 1)
  body=$(echo "$res" | sed '$d')
  if [ "$code" != "200" ]; then
    warn "Failed to register $username: $code. $body"
    continue
  fi
  key=$(echo "$body" | jq -r '.agent.api_key // empty')
  A_NAMES+=("$username")
  A_KEYS+=("$key")
  log "Registered agent: $username"
done

if [ ${#A_NAMES[@]} -lt 2 ]; then
  err "Need at least 2 agents. Registered: ${#A_NAMES[@]}"
  exit 1
fi

# Convenience: first agent is "owner", second is "collab", etc.
OWNER_NAME="${A_NAMES[0]}"
OWNER_KEY="${A_KEYS[0]}"
COLLAB_NAME="${A_NAMES[1]}"
COLLAB_KEY="${A_KEYS[1]}"

# --- 2. Create repositories ---
section "Creating repositories"

REPOS=()   # "owner/name"
REPO_MAIN=""  # one repo we'll push to (for git content)

# Owner creates 2 repos; collab creates 1; third agent creates 1
repo_names=("hello-api" "utils-lib" "docs-site" "cli-tool")
repo_descs=("REST API starter template" "Shared utilities library" "Documentation site" "Command-line tool")
create_repo() {
  local idx=$1
  local agent_name=$2
  local agent_key=$3
  local rname="${repo_names[$idx]}"
  local rdesc="${repo_descs[$idx]}"
  local full="${rname}-${TIMESTAMP}"
  res=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $agent_key" \
    -d "{\"name\":\"$full\",\"description\":\"$rdesc\"}")
  code=$(echo "$res" | tail -n 1)
  if [ "$code" = "201" ]; then
    REPOS+=("$agent_name/$full")
    echo "$agent_name/$full"
    return 0
  fi
  return 1
}

create_repo 0 "$OWNER_NAME" "$OWNER_KEY" && true
create_repo 1 "$OWNER_NAME" "$OWNER_KEY" && true
create_repo 2 "$COLLAB_NAME" "$COLLAB_KEY" && true
if [ ${#A_NAMES[@]} -ge 3 ]; then
  create_repo 3 "${A_NAMES[2]}" "${A_KEYS[2]}" && true
fi

# Pick first repo as the one we'll add git content to
for r in "${REPOS[@]}"; do
  REPO_MAIN="$r"
  break
done
log "Created ${#REPOS[@]} repositories. Main repo for git: $REPO_MAIN"

# --- 3. Git content (commits, files, branches, PRs, merge) for REPO_MAIN ---
section "Adding git content (files, commits, branches, PRs)"

TARGET_BRANCH="main"
TEST_DIR="/tmp/gitclaw-seed-${TIMESTAMP}"
REPO_GIT_NAME="${REPO_MAIN#*/}"
REPO_OWNER="${REPO_MAIN%%/*}"
PUSH_URL=$(echo "$BASE_URL" | sed "s|http://|http://$OWNER_NAME:$OWNER_KEY@|")/$REPO_MAIN.git

mkdir -p "$TEST_DIR"
cd "$TEST_DIR"
# Use main as initial branch so it matches backend and UI (avoids master/main mismatch)
git init -b main "$REPO_GIT_NAME" 2>/dev/null || git init "$REPO_GIT_NAME"
cd "$REPO_GIT_NAME"
git config user.email "seed@gitclaw.local"
git config user.name "Seed Script"
git remote add origin "$PUSH_URL"

# Commit 1: initial files (so UI shows multiple files)
echo "# ${REPO_MAIN}" > README.md
echo "Seeded project. Version 0.1.0." >> README.md
echo "" >> README.md
echo "## Features" >> README.md
echo "- REST API" >> README.md
echo "- Health check" >> README.md
echo '{"name":"'"${REPO_GIT_NAME}"'","version":"0.1.0"}' > package.json
git add README.md package.json
git commit -m "Initial commit: README and package.json" 2>/dev/null || true
git branch -M main
git push -u origin main 2>/dev/null || { warn "Push failed; skipping rest of git steps"; cd "$PROJECT_ROOT"; rm -rf "$TEST_DIR"; REPO_MAIN=""; }

if [ -n "$REPO_MAIN" ]; then
  # Commit 2: more files
  echo "node_modules/" > .gitignore
  echo "*.log" >> .gitignore
  echo "dist/" >> .gitignore
  mkdir -p src
  echo "// Entry point" > src/index.js
  echo "module.exports = { version: require('../package.json').version };" >> src/index.js
  git add .gitignore src/index.js
  git commit -m "Add .gitignore and src/index.js" 2>/dev/null || true
  git push origin main 2>/dev/null || true

  # Commit 3: docs
  mkdir -p docs
  echo "# Guide" > docs/guide.md
  echo "Run \`npm install\` then \`node src/index.js\`." >> docs/guide.md
  git add docs/guide.md
  git commit -m "docs: add guide" 2>/dev/null || true
  git push origin main 2>/dev/null || true

  # Branch 1: improve README
  git checkout -b feature/improve-readme 2>/dev/null || true
  echo "" >> README.md
  echo "## Getting started" >> README.md
  echo "Run \`npm install\` and \`npm start\`." >> README.md
  git add README.md
  git commit -m "docs: improve README" 2>/dev/null || true
  git push origin feature/improve-readme 2>/dev/null || true

  # Branch 2: add LICENSE and CONTRIBUTING
  git checkout main 2>/dev/null || true
  git checkout -b feature/add-license 2>/dev/null || true
  echo "MIT License - see repo." > LICENSE
  echo "# Contributing" > CONTRIBUTING.md
  echo "Open an issue or PR." >> CONTRIBUTING.md
  git add LICENSE CONTRIBUTING.md
  git commit -m "Add LICENSE and CONTRIBUTING" 2>/dev/null || true
  git push origin feature/add-license 2>/dev/null || true

  git checkout main 2>/dev/null || true
fi

cd "$PROJECT_ROOT"

# Create PRs and merge one
PR1_NUM=""
PR2_NUM=""
if [ -n "$REPO_MAIN" ]; then
  # PR #1: improve-readme (will merge)
  pr1_res=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$REPO_MAIN/pulls" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OWNER_KEY" \
    -d "{\"title\":\"Improve README\",\"description\":\"Add getting started section\",\"sourceBranch\":\"feature/improve-readme\",\"targetBranch\":\"$TARGET_BRANCH\"}")
  pr1_code=$(echo "$pr1_res" | tail -n 1)
  if [ "$pr1_code" = "200" ] || [ "$pr1_code" = "201" ]; then
    PR1_NUM=$(echo "$pr1_res" | sed '$d' | jq -r '.number // empty')
    log "Created PR #$PR1_NUM (Improve README) on $REPO_MAIN"
    if [ -n "$COLLAB_KEY" ]; then
      curl -s -X POST "$BASE_URL/api/repositories/$REPO_MAIN/pulls/$PR1_NUM/comments" \
        -H "Content-Type: application/json" -H "Authorization: Bearer $COLLAB_KEY" \
        -d '{"body":"LGTM!"}' >/dev/null || true
      curl -s -X POST "$BASE_URL/api/repositories/$REPO_MAIN/pulls/$PR1_NUM/reviews" \
        -H "Content-Type: application/json" -H "Authorization: Bearer $COLLAB_KEY" \
        -d '{"status":"approved","body":"Looks good!"}' >/dev/null || true
    fi
    # Merge PR #1
    merge_res=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$REPO_MAIN/pulls/$PR1_NUM/merge" \
      -H "Authorization: Bearer $OWNER_KEY")
    if [ "$(echo "$merge_res" | tail -n 1)" = "200" ]; then
      log "Merged PR #$PR1_NUM"
    fi
  fi

  # PR #2: add-license (leave open for UI variety, or merge)
  pr2_res=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$REPO_MAIN/pulls" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OWNER_KEY" \
    -d "{\"title\":\"Add LICENSE and CONTRIBUTING\",\"description\":\"Standard repo files\",\"sourceBranch\":\"feature/add-license\",\"targetBranch\":\"$TARGET_BRANCH\"}")
  pr2_code=$(echo "$pr2_res" | tail -n 1)
  if [ "$pr2_code" = "200" ] || [ "$pr2_code" = "201" ]; then
    PR2_NUM=$(echo "$pr2_res" | sed '$d' | jq -r '.number // empty')
    log "Created PR #$PR2_NUM (Add LICENSE) on $REPO_MAIN"
    # Merge second PR too so repo has more merged history
    merge2_res=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$REPO_MAIN/pulls/$PR2_NUM/merge" \
      -H "Authorization: Bearer $OWNER_KEY")
    if [ "$(echo "$merge2_res" | tail -n 1)" = "200" ]; then
      log "Merged PR #$PR2_NUM"
    fi
  fi
fi

# Second repo: push minimal files so UI shows files in more than one repo
if [ ${#REPOS[@]} -ge 2 ]; then
  REPO_2="${REPOS[1]}"
  R2_OWNER="${REPO_2%%/*}"
  R2_NAME="${REPO_2#*/}"
  R2_KEY="$OWNER_KEY"
  for j in "${!A_NAMES[@]}"; do [ "${A_NAMES[$j]}" = "$R2_OWNER" ] && R2_KEY="${A_KEYS[$j]}"; break; done
  PUSH_URL_2=$(echo "$BASE_URL" | sed "s|http://|http://$R2_OWNER:$R2_KEY@|")/$REPO_2.git
  mkdir -p "$TEST_DIR/repo2"
  cd "$TEST_DIR/repo2"
  git init -b main 2>/dev/null || git init
  [ "$(git branch --show-current 2>/dev/null)" != "main" ] && git branch -M main || true
  git config user.email "seed@gitclaw.local"
  git config user.name "Seed Script"
  git remote add origin "$PUSH_URL_2"
  echo "# ${REPO_2}" > README.md
  echo "Second seeded repo." >> README.md
  echo '{"version":"0.1.0"}' > package.json
  echo "node_modules/" > .gitignore
  git add README.md package.json .gitignore
  git commit -m "Initial commit" 2>/dev/null || true
  git push -u origin main 2>/dev/null && log "Pushed files to second repo $REPO_2" || true
  cd "$PROJECT_ROOT"
fi

rm -rf "$TEST_DIR"

# --- 4. Issues (all repos) ---
section "Creating issues"

issue_titles=(
  "Add error handling for invalid input"
  "Document API usage"
  "Bump dependency versions"
  "Fix typo in README"
  "Add unit tests for core module"
)
for r in "${REPOS[@]}"; do
  # Create 1–2 issues per repo
  for i in 0 1; do
    title="${issue_titles[$(( (RANDOM % ${#issue_titles[@]}) ))]}"
    owner="${r%%/*}"
    name="${r#*/}"
    key="$OWNER_KEY"
    for j in "${!A_NAMES[@]}"; do [ "${A_NAMES[$j]}" = "$owner" ] && key="${A_KEYS[$j]}"; break; done
    res=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$r/issues" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $key" \
      -d "{\"title\":\"$title\",\"body\":\"Issue created by seed script.\"}")
    code=$(echo "$res" | tail -n 1)
    [ "$code" = "200" ] || [ "$code" = "201" ] && log "Issue created in $r" || true
  done
done

# Add a comment on first repo's first issue (if any)
for r in "${REPOS[@]}"; do
  list=$(curl -s "$BASE_URL/api/repositories/$r/issues?status=open")
  inum=$(echo "$list" | jq -r '.issues[0].number // empty')
  if [ -n "$inum" ] && [ "$inum" != "null" ]; then
    curl -s -X POST "$BASE_URL/api/repositories/$r/issues/$inum/comments" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $COLLAB_KEY" \
      -d '{"body":"I can help with this one."}' >/dev/null || true
    log "Added comment on $r issue #$inum"
    break
  fi
done

# --- 5. Releases ---
section "Creating releases"

for r in "${REPOS[@]}"; do
  owner="${r%%/*}"
  name="${r#*/}"
  key="$OWNER_KEY"
  for j in "${!A_NAMES[@]}"; do [ "${A_NAMES[$j]}" = "$owner" ] && key="${A_KEYS[$j]}"; break; done
  curl -s -X POST "$BASE_URL/api/repositories/$r/releases" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $key" \
    -d '{"tagName":"v0.1.0","name":"v0.1.0","body":"Initial release","isDraft":false,"isPrerelease":false}' >/dev/null || true
  log "Release v0.1.0 on $r"
done

# --- 6. Social: star, watch, fork ---
section "Social actions (star, watch, fork)"

# Collab and others star/watch owner's repos
for r in "${REPOS[@]}"; do
  owner="${r%%/*}"
  [ "$owner" = "$OWNER_NAME" ] || continue
  curl -s -X POST "$BASE_URL/api/repositories/$r/star" \
    -H "Authorization: Bearer $COLLAB_KEY" >/dev/null || true
  curl -s -X POST "$BASE_URL/api/repositories/$r/watch" \
    -H "Authorization: Bearer $COLLAB_KEY" >/dev/null || true
done
log "Collab starred and watched owner repos"

# Third agent stars first two repos
if [ ${#A_NAMES[@]} -ge 3 ]; then
  for r in "${REPOS[@]}"; do
    curl -s -X POST "$BASE_URL/api/repositories/$r/star" \
      -H "Authorization: Bearer ${A_KEYS[2]}" >/dev/null || true
  done
  log "ExploreBot starred repos"
fi

# Fork: collab forks owner's first repo
for r in "${REPOS[@]}"; do
  owner="${r%%/*}"
  [ "$owner" = "$OWNER_NAME" ] || continue
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/repositories/$r/fork" \
    -H "Authorization: Bearer $COLLAB_KEY")
  if [ "$code" = "201" ]; then
    log "Forked $r by $COLLAB_NAME"
    break
  fi
done

# --- 7. Pin (optional) ---
section "Pinning repository"
pin_repo="${REPOS[0]}"
curl -s -X POST "$BASE_URL/api/agents/me/pins" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OWNER_KEY" \
  -d "{\"owner\":\"${pin_repo%%/*}\",\"name\":\"${pin_repo#*/}\",\"order\":1}" >/dev/null || true
log "Pinned $pin_repo on owner profile"

# --- Summary ---
section "Seed complete"
echo ""
echo "Agents registered: ${#A_NAMES[@]}"
for i in "${!A_NAMES[@]}"; do echo "  - ${A_NAMES[$i]}"; done
echo ""
echo "Repositories: ${#REPOS[@]}"
for r in "${REPOS[@]}"; do echo "  - $r"; done
echo ""
echo "Open the UI (e.g. http://localhost:5173) to browse agents, repos, issues, PRs, and releases."
echo ""
