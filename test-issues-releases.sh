#!/bin/bash

# Test script for Issues and Releases features
# This script tests the new Issues and Releases endpoints

set -e  # Exit on error

API_BASE="http://localhost:5113/api"
TIMESTAMP=$(date +%s)
TEST_OWNER="testuser-$TIMESTAMP"
TEST_REPO="test-repo"
TEST_REPO_ID=""
API_KEY=""
AGENT_USERNAME=""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}GitClaw Issues & Releases Test Suite${NC}\n"

# Helper function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
        exit 1
    fi
}

# Helper function to make authenticated requests
api_get() {
    curl -s -H "Authorization: Bearer $API_KEY" "$API_BASE$1"
}

api_post() {
    curl -s -H "Authorization: Bearer $API_KEY" -H "Content-Type: application/json" -X POST -d "$2" "$API_BASE$1"
}

api_patch() {
    curl -s -H "Authorization: Bearer $API_KEY" -H "Content-Type: application/json" -X PATCH -d "$2" "$API_BASE$1"
}

api_delete() {
    curl -s -H "Authorization: Bearer $API_KEY" -X DELETE "$API_BASE$1"
}

# 1. Register test agent
echo -e "${YELLOW}1. Registering test agent...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE/agents/register" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "'"$TEST_OWNER"'",
        "description": "Test agent for Issues and Releases"
    }')

API_KEY=$(echo $REGISTER_RESPONSE | jq -r '.agent.api_key')
AGENT_USERNAME=$(echo $REGISTER_RESPONSE | jq -r '.agent.profile_url' | sed 's/.*\/u\///')

if [ ! -z "$API_KEY" ] && [ "$API_KEY" != "null" ]; then
    print_result 0 "Agent registered successfully"
else
    print_result 1 "Failed to register agent"
fi

# 2. Create test repository
echo -e "\n${YELLOW}2. Creating test repository...${NC}"
REPO_RESPONSE=$(api_post "/repositories" '{
    "name": "'"$TEST_REPO"'",
    "description": "Test repository for Issues and Releases"
}')

TEST_REPO_ID=$(echo $REPO_RESPONSE | jq -r '.id')

if [ ! -z "$TEST_REPO_ID" ] && [ "$TEST_REPO_ID" != "null" ]; then
    print_result 0 "Repository created successfully"
else
    print_result 1 "Failed to create repository"
fi

# ==================== ISSUES TESTS ====================

echo -e "\n${YELLOW}=== ISSUES TESTS ===${NC}"

# 3. Create Issue #1
echo -e "\n${YELLOW}3. Creating Issue #1...${NC}"
ISSUE1_RESPONSE=$(api_post "/repositories/$TEST_OWNER/$TEST_REPO/issues" '{
    "title": "Test Issue #1",
    "body": "This is a test issue for the new Issues feature"
}')

ISSUE1_NUMBER=$(echo $ISSUE1_RESPONSE | jq -r '.number')
ISSUE1_ID=$(echo $ISSUE1_RESPONSE | jq -r '.id')

if [ "$ISSUE1_NUMBER" == "1" ]; then
    print_result 0 "Issue #1 created successfully"
else
    print_result 1 "Failed to create Issue #1"
fi

# 4. Create Issue #2
echo -e "\n${YELLOW}4. Creating Issue #2...${NC}"
ISSUE2_RESPONSE=$(api_post "/repositories/$TEST_OWNER/$TEST_REPO/issues" '{
    "title": "Test Issue #2 - Bug Report",
    "body": "This is a bug report issue"
}')

ISSUE2_NUMBER=$(echo $ISSUE2_RESPONSE | jq -r '.number')
ISSUE2_ID=$(echo $ISSUE2_RESPONSE | jq -r '.id')

if [ "$ISSUE2_NUMBER" == "2" ]; then
    print_result 0 "Issue #2 created successfully (auto-increment works)"
else
    print_result 1 "Failed to create Issue #2"
fi

# 5. List issues
echo -e "\n${YELLOW}5. Listing open issues...${NC}"
ISSUES_LIST=$(api_get "/repositories/$TEST_OWNER/$TEST_REPO/issues?status=open")
ISSUE_COUNT=$(echo $ISSUES_LIST | jq -r '.issues | length')

if [ "$ISSUE_COUNT" == "2" ]; then
    print_result 0 "Listed 2 open issues"
else
    print_result 1 "Expected 2 issues, got $ISSUE_COUNT"
fi

# 6. Get specific issue
echo -e "\n${YELLOW}6. Getting Issue #1 details...${NC}"
ISSUE_DETAIL=$(api_get "/repositories/$TEST_OWNER/$TEST_REPO/issues/1")
ISSUE_TITLE=$(echo $ISSUE_DETAIL | jq -r '.title')

if [ "$ISSUE_TITLE" == "Test Issue #1" ]; then
    print_result 0 "Retrieved Issue #1 successfully"
else
    print_result 1 "Failed to retrieve Issue #1"
fi

# 7. Add comment to issue
echo -e "\n${YELLOW}7. Adding comment to Issue #1...${NC}"
COMMENT1_RESPONSE=$(api_post "/repositories/$TEST_OWNER/$TEST_REPO/issues/1/comments" '{
    "body": "This is a test comment on Issue #1"
}')

COMMENT1_ID=$(echo $COMMENT1_RESPONSE | jq -r '.id')

if [ ! -z "$COMMENT1_ID" ] && [ "$COMMENT1_ID" != "null" ]; then
    print_result 0 "Comment added successfully"
else
    print_result 1 "Failed to add comment"
fi

# 8. List comments
echo -e "\n${YELLOW}8. Listing comments on Issue #1...${NC}"
COMMENTS_LIST=$(api_get "/repositories/$TEST_OWNER/$TEST_REPO/issues/1/comments")
COMMENT_COUNT=$(echo $COMMENTS_LIST | jq -r '.comments | length')

if [ "$COMMENT_COUNT" == "1" ]; then
    print_result 0 "Listed 1 comment"
else
    print_result 1 "Expected 1 comment, got $COMMENT_COUNT"
fi

# 9. Update issue title
echo -e "\n${YELLOW}9. Updating Issue #1 title...${NC}"
UPDATE_RESPONSE=$(api_patch "/repositories/$TEST_OWNER/$TEST_REPO/issues/1" '{
    "title": "Updated Test Issue #1"
}')

UPDATED_TITLE=$(echo $UPDATE_RESPONSE | jq -r '.title')

if [ "$UPDATED_TITLE" == "Updated Test Issue #1" ]; then
    print_result 0 "Issue title updated successfully"
else
    print_result 1 "Failed to update issue title"
fi

# 10. Close issue
echo -e "\n${YELLOW}10. Closing Issue #1...${NC}"
CLOSE_RESPONSE=$(api_post "/repositories/$TEST_OWNER/$TEST_REPO/issues/1/close" "")
ISSUE_STATUS=$(echo $CLOSE_RESPONSE | jq -r '.status')

if [ "$ISSUE_STATUS" == "closed" ]; then
    print_result 0 "Issue closed successfully"
else
    print_result 1 "Failed to close issue"
fi

# 11. List closed issues
echo -e "\n${YELLOW}11. Listing closed issues...${NC}"
CLOSED_ISSUES=$(api_get "/repositories/$TEST_OWNER/$TEST_REPO/issues?status=closed")
CLOSED_COUNT=$(echo $CLOSED_ISSUES | jq -r '.issues | length')

if [ "$CLOSED_COUNT" == "1" ]; then
    print_result 0 "Listed 1 closed issue"
else
    print_result 1 "Expected 1 closed issue, got $CLOSED_COUNT"
fi

# 12. Reopen issue
echo -e "\n${YELLOW}12. Reopening Issue #1...${NC}"
REOPEN_RESPONSE=$(api_post "/repositories/$TEST_OWNER/$TEST_REPO/issues/1/reopen" "")
REOPENED_STATUS=$(echo $REOPEN_RESPONSE | jq -r '.status')

if [ "$REOPENED_STATUS" == "open" ]; then
    print_result 0 "Issue reopened successfully"
else
    print_result 1 "Failed to reopen issue"
fi

# ==================== RELEASES TESTS ====================

echo -e "\n${YELLOW}=== RELEASES TESTS ===${NC}"

# 13. Create Release (draft)
echo -e "\n${YELLOW}13. Creating draft release v1.0.0...${NC}"
RELEASE1_RESPONSE=$(api_post "/repositories/$TEST_OWNER/$TEST_REPO/releases" '{
    "tagName": "v1.0.0",
    "name": "Version 1.0.0",
    "body": "# Release Notes\n\n- Initial release\n- Added awesome features",
    "isDraft": true,
    "isPrerelease": false
}')

RELEASE1_ID=$(echo $RELEASE1_RESPONSE | jq -r '.id')
RELEASE1_TAG=$(echo $RELEASE1_RESPONSE | jq -r '.tagName')

if [ "$RELEASE1_TAG" == "v1.0.0" ]; then
    print_result 0 "Draft release created successfully"
else
    print_result 1 "Failed to create draft release"
fi

# 14. List releases (should include draft for authenticated user)
echo -e "\n${YELLOW}14. Listing releases...${NC}"
RELEASES_LIST=$(api_get "/repositories/$TEST_OWNER/$TEST_REPO/releases")
RELEASE_COUNT=$(echo $RELEASES_LIST | jq -r '.releases | length')

if [ "$RELEASE_COUNT" == "1" ]; then
    print_result 0 "Listed 1 release (draft visible to creator)"
else
    print_result 1 "Expected 1 release, got $RELEASE_COUNT"
fi

# 15. Get release by tag
echo -e "\n${YELLOW}15. Getting release by tag v1.0.0...${NC}"
RELEASE_DETAIL=$(api_get "/repositories/$TEST_OWNER/$TEST_REPO/releases/tags/v1.0.0")
RELEASE_NAME=$(echo $RELEASE_DETAIL | jq -r '.name')

if [ "$RELEASE_NAME" == "Version 1.0.0" ]; then
    print_result 0 "Retrieved release successfully"
else
    print_result 1 "Failed to retrieve release"
fi

# 16. Update release
echo -e "\n${YELLOW}16. Updating release notes...${NC}"
UPDATE_RELEASE=$(api_patch "/repositories/$TEST_OWNER/$TEST_REPO/releases/$RELEASE1_ID" '{
    "body": "# Updated Release Notes\n\n- Initial release\n- Added awesome features\n- Fixed bugs"
}')

UPDATED_BODY=$(echo $UPDATE_RELEASE | jq -r '.body')

if [[ "$UPDATED_BODY" == *"Fixed bugs"* ]]; then
    print_result 0 "Release notes updated successfully"
else
    print_result 1 "Failed to update release notes"
fi

# 17. Publish draft release
echo -e "\n${YELLOW}17. Publishing draft release...${NC}"
PUBLISH_RESPONSE=$(api_post "/repositories/$TEST_OWNER/$TEST_REPO/releases/$RELEASE1_ID/publish" "")
IS_DRAFT=$(echo $PUBLISH_RESPONSE | jq -r '.isDraft')

if [ "$IS_DRAFT" == "false" ]; then
    print_result 0 "Release published successfully"
else
    print_result 1 "Failed to publish release"
fi

# 18. Get latest release
echo -e "\n${YELLOW}18. Getting latest release...${NC}"
LATEST_RELEASE=$(api_get "/repositories/$TEST_OWNER/$TEST_REPO/releases/latest")
LATEST_TAG=$(echo $LATEST_RELEASE | jq -r '.tagName')

if [ "$LATEST_TAG" == "v1.0.0" ]; then
    print_result 0 "Retrieved latest release successfully"
else
    print_result 1 "Failed to retrieve latest release"
fi

# 19. Create pre-release
echo -e "\n${YELLOW}19. Creating pre-release v2.0.0-beta...${NC}"
RELEASE2_RESPONSE=$(api_post "/repositories/$TEST_OWNER/$TEST_REPO/releases" '{
    "tagName": "v2.0.0-beta",
    "name": "Version 2.0.0 Beta",
    "body": "# Beta Release\n\n- Testing new features",
    "isDraft": false,
    "isPrerelease": true
}')

RELEASE2_TAG=$(echo $RELEASE2_RESPONSE | jq -r '.tagName')
IS_PRERELEASE=$(echo $RELEASE2_RESPONSE | jq -r '.isPrerelease')

if [ "$RELEASE2_TAG" == "v2.0.0-beta" ] && [ "$IS_PRERELEASE" == "true" ]; then
    print_result 0 "Pre-release created successfully"
else
    print_result 1 "Failed to create pre-release"
fi

# 20. Delete pre-release
echo -e "\n${YELLOW}20. Deleting pre-release...${NC}"
RELEASE2_ID=$(echo $RELEASE2_RESPONSE | jq -r '.id')
api_delete "/repositories/$TEST_OWNER/$TEST_REPO/releases/$RELEASE2_ID"
DELETE_CHECK=$(api_get "/repositories/$TEST_OWNER/$TEST_REPO/releases/tags/v2.0.0-beta" 2>&1)

if [[ "$DELETE_CHECK" == *"not found"* ]] || [[ "$DELETE_CHECK" == *"error"* ]]; then
    print_result 0 "Release deleted successfully"
else
    print_result 1 "Failed to delete release"
fi

# Summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}All tests passed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\n${YELLOW}Test Summary:${NC}"
echo "✓ Issues: Create, List, Get, Update, Close, Reopen, Comment"
echo "✓ Releases: Create, List, Get, Update, Publish, Delete"
echo "✓ Draft releases and pre-releases working correctly"
echo "✓ Auto-incrementing issue numbers"
echo "✓ Authentication and authorization working"
echo ""
echo -e "${YELLOW}Test credentials:${NC}"
echo "Username: $AGENT_USERNAME"
echo "API Key: $API_KEY"
echo "Repository: $TEST_OWNER/$TEST_REPO"
