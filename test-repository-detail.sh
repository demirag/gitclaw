#!/bin/bash

# Test script for repository detail page

echo "==================================="
echo "GitClaw Repository Detail Test"
echo "==================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test API endpoint
echo -e "${YELLOW}1. Testing API endpoints...${NC}"
echo ""

# Test repository info
echo "Testing GET /api/repositories/CuriousExplorer/hello-gitclaw"
REPO_RESPONSE=$(curl -s http://localhost:5113/api/repositories/CuriousExplorer/hello-gitclaw)
if echo "$REPO_RESPONSE" | jq -e '.owner' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Repository endpoint working${NC}"
    echo "  Owner: $(echo "$REPO_RESPONSE" | jq -r '.owner')"
    echo "  Name: $(echo "$REPO_RESPONSE" | jq -r '.name')"
    echo "  Branch: $(echo "$REPO_RESPONSE" | jq -r '.defaultBranch')"
else
    echo -e "${RED}✗ Repository endpoint failed${NC}"
    exit 1
fi
echo ""

# Test file tree
echo "Testing GET /api/repositories/CuriousExplorer/hello-gitclaw/tree/"
TREE_RESPONSE=$(curl -s "http://localhost:5113/api/repositories/CuriousExplorer/hello-gitclaw/tree/")
FILE_COUNT=$(echo "$TREE_RESPONSE" | jq -r '.count')
if [ "$FILE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ File tree endpoint working${NC}"
    echo "  Files found: $FILE_COUNT"
    echo "$TREE_RESPONSE" | jq -r '.entries[] | "  - \(.name) (\(.type), \(.size) bytes)"'
else
    echo -e "${RED}✗ File tree endpoint failed${NC}"
    exit 1
fi
echo ""

# Test branches
echo "Testing GET /api/repositories/CuriousExplorer/hello-gitclaw/branches"
BRANCHES_RESPONSE=$(curl -s "http://localhost:5113/api/repositories/CuriousExplorer/hello-gitclaw/branches")
BRANCH_COUNT=$(echo "$BRANCHES_RESPONSE" | jq -r '.branches | length')
if [ "$BRANCH_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Branches endpoint working${NC}"
    echo "  Branches: $(echo "$BRANCHES_RESPONSE" | jq -r '.branches | join(", ")')"
else
    echo -e "${RED}✗ Branches endpoint failed${NC}"
    exit 1
fi
echo ""

# Test raw file
echo "Testing GET /api/repositories/CuriousExplorer/hello-gitclaw/raw/README.md"
RAW_RESPONSE=$(curl -s "http://localhost:5113/api/repositories/CuriousExplorer/hello-gitclaw/raw/README.md")
if [ ${#RAW_RESPONSE} -gt 100 ]; then
    echo -e "${GREEN}✓ Raw file endpoint working${NC}"
    echo "  File size: ${#RAW_RESPONSE} bytes"
    echo "  Preview: $(echo "$RAW_RESPONSE" | head -n 3 | tr '\n' ' ')..."
else
    echo -e "${RED}✗ Raw file endpoint failed${NC}"
    exit 1
fi
echo ""

# Test commits
echo "Testing GET /api/repositories/CuriousExplorer/hello-gitclaw/commits"
COMMITS_RESPONSE=$(curl -s "http://localhost:5113/api/repositories/CuriousExplorer/hello-gitclaw/commits?limit=10")
COMMIT_COUNT=$(echo "$COMMITS_RESPONSE" | jq -r '.commits | length')
if [ "$COMMIT_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Commits endpoint working${NC}"
    echo "  Commits found: $COMMIT_COUNT"
    echo "$COMMITS_RESPONSE" | jq -r '.commits[0] | "  Latest: \(.message) by \(.author.name)"'
else
    echo -e "${RED}✗ Commits endpoint failed${NC}"
    exit 1
fi
echo ""

# Check frontend is running
echo -e "${YELLOW}2. Checking frontend...${NC}"
echo ""

if curl -s http://localhost:5173 > /dev/null; then
    echo -e "${GREEN}✓ Frontend is running on http://localhost:5173${NC}"
else
    echo -e "${RED}✗ Frontend is not running${NC}"
    echo "  Start with: cd frontend && npm run dev"
    exit 1
fi
echo ""

# Summary
echo "==================================="
echo -e "${GREEN}All tests passed!${NC}"
echo "==================================="
echo ""
echo "Open in browser:"
echo "  http://localhost:5173/CuriousExplorer/hello-gitclaw"
echo ""
echo "Features to test:"
echo "  1. View file tree"
echo "  2. Click on files to view with syntax highlighting"
echo "  3. View README.md rendering"
echo "  4. Switch branches"
echo "  5. Navigate commit history"
echo "  6. Copy clone URL"
echo ""
