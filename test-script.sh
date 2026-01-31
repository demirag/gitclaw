#!/bin/bash

# GitClaw Comprehensive Test Script
# Timestamp: $(date +%Y%m%d_%H%M%S)

BASE_URL="http://localhost:5113"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TEST_RESULTS_FILE="test-results-${TIMESTAMP}.md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Log function
log_test() {
    local status=$1
    local test_name=$2
    local details=$3
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$status" == "PASS" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✓ PASS${NC}: $test_name"
        echo "✓ **PASS**: $test_name" >> "$TEST_RESULTS_FILE"
    elif [ "$status" == "FAIL" ]; then
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${RED}✗ FAIL${NC}: $test_name"
        echo "✗ **FAIL**: $test_name" >> "$TEST_RESULTS_FILE"
    else
        echo -e "${YELLOW}⚠ WARN${NC}: $test_name"
        echo "⚠ **WARN**: $test_name" >> "$TEST_RESULTS_FILE"
    fi
    
    if [ -n "$details" ]; then
        echo "  Details: $details"
        echo "  - Details: $details" >> "$TEST_RESULTS_FILE"
    fi
    echo "" >> "$TEST_RESULTS_FILE"
}

# Initialize results file
cat > "$TEST_RESULTS_FILE" << 'HEADER'
# GitClaw Comprehensive Test Results

**Test Date:** $(date)
**Backend URL:** http://localhost:5113
**Frontend URL:** http://localhost:5173

---

## Test Results Summary

HEADER

echo "Starting GitClaw Comprehensive Testing..."
echo "Results will be saved to: $TEST_RESULTS_FILE"
echo ""

# Test 1: Health Check
echo "## 1. Health Check" >> "$TEST_RESULTS_FILE"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" $BASE_URL/health)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "200" ]; then
    log_test "PASS" "Backend health check" "Status: $HTTP_CODE, Response: $BODY"
else
    log_test "FAIL" "Backend health check" "Expected 200, got $HTTP_CODE"
fi

# Test 2: Agent Registration
echo "## 2. Agent Registration Tests" >> "$TEST_RESULTS_FILE"

# Test 2.1: Register first agent
AGENT1_USERNAME="testagent$(date +%s)"
AGENT1_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/agents/register \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$AGENT1_USERNAME\",\"email\":\"$AGENT1_USERNAME@example.com\",\"displayName\":\"Test Agent 1\"}")

HTTP_CODE=$(echo "$AGENT1_RESPONSE" | tail -n1)
AGENT1_DATA=$(echo "$AGENT1_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "201" ]; then
    log_test "PASS" "Agent registration" "Registered: $AGENT1_USERNAME, Code: $HTTP_CODE"
    VERIFICATION_CODE=$(echo "$AGENT1_DATA" | grep -o '"verificationCode":"[^"]*"' | cut -d'"' -f4)
    echo "Verification code: $VERIFICATION_CODE"
else
    log_test "FAIL" "Agent registration" "Expected 200/201, got $HTTP_CODE. Response: $AGENT1_DATA"
fi

# Test 2.2: Duplicate username (should fail)
DUPLICATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/agents/register \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$AGENT1_USERNAME\",\"email\":\"different@example.com\",\"displayName\":\"Duplicate\"}")

DUP_HTTP_CODE=$(echo "$DUPLICATE_RESPONSE" | tail -n1)
if [ "$DUP_HTTP_CODE" == "400" ] || [ "$DUP_HTTP_CODE" == "409" ]; then
    log_test "PASS" "Duplicate username rejection" "Correctly rejected with code $DUP_HTTP_CODE"
else
    log_test "FAIL" "Duplicate username rejection" "Expected 400/409, got $DUP_HTTP_CODE"
fi

# Test 2.3: Case sensitivity test
AGENT2_USERNAME=$(echo "$AGENT1_USERNAME" | tr '[:lower:]' '[:upper:]')
CASE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/agents/register \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$AGENT2_USERNAME\",\"email\":\"upper@example.com\",\"displayName\":\"Upper Case\"}")

CASE_HTTP_CODE=$(echo "$CASE_RESPONSE" | tail -n1)
if [ "$CASE_HTTP_CODE" == "400" ] || [ "$CASE_HTTP_CODE" == "409" ]; then
    log_test "PASS" "Case-insensitive username check" "Correctly rejected uppercase variant"
else
    log_test "FAIL" "Case-insensitive username check" "Should reject case variant, got $CASE_HTTP_CODE"
fi

# Test 2.4: Register second agent for multi-agent tests
AGENT2_USERNAME="testagent2_$(date +%s)"
AGENT2_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/agents/register \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$AGENT2_USERNAME\",\"email\":\"$AGENT2_USERNAME@example.com\",\"displayName\":\"Test Agent 2\"}")

AGENT2_HTTP_CODE=$(echo "$AGENT2_RESPONSE" | tail -n1)
if [ "$AGENT2_HTTP_CODE" == "200" ] || [ "$AGENT2_HTTP_CODE" == "201" ]; then
    log_test "PASS" "Second agent registration" "Registered: $AGENT2_USERNAME"
else
    log_test "FAIL" "Second agent registration" "Failed with code $AGENT2_HTTP_CODE"
fi

# Test 3: Profile Viewing
echo "## 3. Profile Viewing Tests" >> "$TEST_RESULTS_FILE"

# Test 3.1: Get agent profile
PROFILE_RESPONSE=$(curl -s -w "\n%{http_code}" $BASE_URL/api/agents/$AGENT1_USERNAME)
PROFILE_HTTP_CODE=$(echo "$PROFILE_RESPONSE" | tail -n1)
PROFILE_DATA=$(echo "$PROFILE_RESPONSE" | head -n-1)

if [ "$PROFILE_HTTP_CODE" == "200" ]; then
    log_test "PASS" "Get agent profile" "Successfully retrieved profile for $AGENT1_USERNAME"
    echo "Profile data: $PROFILE_DATA" | head -c 200
else
    log_test "FAIL" "Get agent profile" "Expected 200, got $PROFILE_HTTP_CODE"
fi

# Test 3.2: Non-existent agent (should 404)
NOTFOUND_RESPONSE=$(curl -s -w "\n%{http_code}" $BASE_URL/api/agents/nonexistentagent999)
NOTFOUND_HTTP_CODE=$(echo "$NOTFOUND_RESPONSE" | tail -n1)

if [ "$NOTFOUND_HTTP_CODE" == "404" ]; then
    log_test "PASS" "Non-existent agent 404" "Correctly returned 404"
else
    log_test "FAIL" "Non-existent agent 404" "Expected 404, got $NOTFOUND_HTTP_CODE"
fi

# Test 4: Repository Creation
echo "## 4. Repository Creation Tests" >> "$TEST_RESULTS_FILE"

# Test 4.1: Create repository
REPO_NAME="test-repo-$(date +%s)"
REPO_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/repositories \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$REPO_NAME\",\"description\":\"Test repository\",\"isPrivate\":false,\"ownerUsername\":\"$AGENT1_USERNAME\"}")

REPO_HTTP_CODE=$(echo "$REPO_RESPONSE" | tail -n1)
REPO_DATA=$(echo "$REPO_RESPONSE" | head -n-1)

if [ "$REPO_HTTP_CODE" == "200" ] || [ "$REPO_HTTP_CODE" == "201" ]; then
    log_test "PASS" "Create repository" "Created: $AGENT1_USERNAME/$REPO_NAME"
else
    log_test "FAIL" "Create repository" "Expected 200/201, got $REPO_HTTP_CODE. Response: $REPO_DATA"
fi

# Test 4.2: Create private repository
PRIVATE_REPO_NAME="private-repo-$(date +%s)"
PRIVATE_REPO_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/repositories \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$PRIVATE_REPO_NAME\",\"description\":\"Private test repository\",\"isPrivate\":true,\"ownerUsername\":\"$AGENT1_USERNAME\"}")

PRIVATE_HTTP_CODE=$(echo "$PRIVATE_REPO_RESPONSE" | tail -n1)
if [ "$PRIVATE_HTTP_CODE" == "200" ] || [ "$PRIVATE_HTTP_CODE" == "201" ]; then
    log_test "PASS" "Create private repository" "Created: $AGENT1_USERNAME/$PRIVATE_REPO_NAME"
else
    log_test "FAIL" "Create private repository" "Failed with code $PRIVATE_HTTP_CODE"
fi

# Test 4.3: Duplicate repository name (should fail)
DUP_REPO_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/repositories \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$REPO_NAME\",\"description\":\"Duplicate\",\"isPrivate\":false,\"ownerUsername\":\"$AGENT1_USERNAME\"}")

DUP_REPO_HTTP_CODE=$(echo "$DUP_REPO_RESPONSE" | tail -n1)
if [ "$DUP_REPO_HTTP_CODE" == "400" ] || [ "$DUP_REPO_HTTP_CODE" == "409" ]; then
    log_test "PASS" "Duplicate repository rejection" "Correctly rejected duplicate"
else
    log_test "FAIL" "Duplicate repository rejection" "Expected 400/409, got $DUP_REPO_HTTP_CODE"
fi

# Test 5: Repository Listing
echo "## 5. Repository Listing Tests" >> "$TEST_RESULTS_FILE"

LIST_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/agents/$AGENT1_USERNAME/repositories")
LIST_HTTP_CODE=$(echo "$LIST_RESPONSE" | tail -n1)
LIST_DATA=$(echo "$LIST_RESPONSE" | head -n-1)

if [ "$LIST_HTTP_CODE" == "200" ]; then
    REPO_COUNT=$(echo "$LIST_DATA" | grep -o "\"name\"" | wc -l)
    log_test "PASS" "List agent repositories" "Found $REPO_COUNT repositories"
else
    log_test "FAIL" "List agent repositories" "Expected 200, got $LIST_HTTP_CODE"
fi

# Test 6: Git Operations
echo "## 6. Git Operations Tests" >> "$TEST_RESULTS_FILE"

# Create a temporary directory for git operations
TEST_DIR="/tmp/gitclaw-test-$TIMESTAMP"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Test 6.1: Clone repository
git clone http://localhost:5113/git/$AGENT1_USERNAME/$REPO_NAME.git 2>&1 > /tmp/git-clone.log
if [ $? -eq 0 ] && [ -d "$REPO_NAME" ]; then
    log_test "PASS" "Clone repository" "Successfully cloned $REPO_NAME"
    cd "$REPO_NAME"
else
    log_test "FAIL" "Clone repository" "Failed to clone. Check /tmp/git-clone.log"
fi

# Test 6.2: Create and commit files
if [ -d ".git" ]; then
    echo "# Test Repository" > README.md
    git add README.md
    git config user.email "test@gitclaw.test"
    git config user.name "Test User"
    git commit -m "Initial commit" 2>&1 > /tmp/git-commit.log
    
    if [ $? -eq 0 ]; then
        log_test "PASS" "Create commit" "Successfully created commit"
    else
        log_test "FAIL" "Create commit" "Failed to create commit"
    fi
    
    # Test 6.3: Push changes
    git push origin main 2>&1 > /tmp/git-push.log
    if [ $? -eq 0 ]; then
        log_test "PASS" "Push changes" "Successfully pushed to main"
    else
        log_test "FAIL" "Push changes" "Failed to push. Check /tmp/git-push.log"
    fi
    
    # Test 6.4: Create a branch
    git checkout -b feature-test 2>&1 > /tmp/git-branch.log
    echo "Feature content" > feature.txt
    git add feature.txt
    git commit -m "Add feature"
    git push origin feature-test 2>&1 >> /tmp/git-push.log
    
    if [ $? -eq 0 ]; then
        log_test "PASS" "Create and push branch" "Successfully created feature-test branch"
    else
        log_test "FAIL" "Create and push branch" "Failed to push branch"
    fi
fi

cd /home/azureuser/gitclaw

# Test 7: Repository Browsing
echo "## 7. Repository Browsing Tests" >> "$TEST_RESULTS_FILE"

# Test 7.1: Get repository info
REPO_INFO_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME")
REPO_INFO_HTTP_CODE=$(echo "$REPO_INFO_RESPONSE" | tail -n1)

if [ "$REPO_INFO_HTTP_CODE" == "200" ]; then
    log_test "PASS" "Get repository info" "Successfully retrieved repository info"
else
    log_test "FAIL" "Get repository info" "Expected 200, got $REPO_INFO_HTTP_CODE"
fi

# Test 7.2: Get branches
BRANCHES_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/branches")
BRANCHES_HTTP_CODE=$(echo "$BRANCHES_RESPONSE" | tail -n1)
BRANCHES_DATA=$(echo "$BRANCHES_RESPONSE" | head -n-1)

if [ "$BRANCHES_HTTP_CODE" == "200" ]; then
    BRANCH_COUNT=$(echo "$BRANCHES_DATA" | grep -o "\"name\"" | wc -l)
    log_test "PASS" "List branches" "Found $BRANCH_COUNT branches"
else
    log_test "FAIL" "List branches" "Expected 200, got $BRANCHES_HTTP_CODE"
fi

# Test 7.3: Get commits
COMMITS_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/commits")
COMMITS_HTTP_CODE=$(echo "$COMMITS_RESPONSE" | tail -n1)
COMMITS_DATA=$(echo "$COMMITS_RESPONSE" | head -n-1)

if [ "$COMMITS_HTTP_CODE" == "200" ]; then
    COMMIT_COUNT=$(echo "$COMMITS_DATA" | grep -o "\"sha\"" | wc -l)
    log_test "PASS" "List commits" "Found $COMMIT_COUNT commits"
else
    log_test "FAIL" "List commits" "Expected 200, got $COMMITS_HTTP_CODE"
fi

# Test 7.4: Get file tree
TREE_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/tree")
TREE_HTTP_CODE=$(echo "$TREE_RESPONSE" | tail -n1)

if [ "$TREE_HTTP_CODE" == "200" ]; then
    log_test "PASS" "Get file tree" "Successfully retrieved file tree"
else
    log_test "FAIL" "Get file tree" "Expected 200, got $TREE_HTTP_CODE"
fi

# Test 8: Pull Requests
echo "## 8. Pull Request Tests" >> "$TEST_RESULTS_FILE"

# Test 8.1: Create pull request
PR_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/pulls" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"Test PR\",\"description\":\"Test pull request\",\"sourceBranch\":\"feature-test\",\"targetBranch\":\"main\",\"authorUsername\":\"$AGENT1_USERNAME\"}")

PR_HTTP_CODE=$(echo "$PR_RESPONSE" | tail -n1)
PR_DATA=$(echo "$PR_RESPONSE" | head -n-1)

if [ "$PR_HTTP_CODE" == "200" ] || [ "$PR_HTTP_CODE" == "201" ]; then
    PR_NUMBER=$(echo "$PR_DATA" | grep -o '"number":[0-9]*' | head -1 | cut -d':' -f2)
    log_test "PASS" "Create pull request" "Created PR #$PR_NUMBER"
else
    log_test "FAIL" "Create pull request" "Expected 200/201, got $PR_HTTP_CODE. Response: $PR_DATA"
    PR_NUMBER=""
fi

# Test 8.2: List pull requests
LIST_PR_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/pulls")
LIST_PR_HTTP_CODE=$(echo "$LIST_PR_RESPONSE" | tail -n1)

if [ "$LIST_PR_HTTP_CODE" == "200" ]; then
    log_test "PASS" "List pull requests" "Successfully listed PRs"
else
    log_test "FAIL" "List pull requests" "Expected 200, got $LIST_PR_HTTP_CODE"
fi

# Test 8.3: Add comment to PR (if PR was created)
if [ -n "$PR_NUMBER" ]; then
    COMMENT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/pulls/$PR_NUMBER/comments" \
        -H "Content-Type: application/json" \
        -d "{\"content\":\"Test comment\",\"authorUsername\":\"$AGENT2_USERNAME\"}")
    
    COMMENT_HTTP_CODE=$(echo "$COMMENT_RESPONSE" | tail -n1)
    if [ "$COMMENT_HTTP_CODE" == "200" ] || [ "$COMMENT_HTTP_CODE" == "201" ]; then
        log_test "PASS" "Add PR comment" "Successfully added comment to PR #$PR_NUMBER"
    else
        log_test "FAIL" "Add PR comment" "Expected 200/201, got $COMMENT_HTTP_CODE"
    fi
    
    # Test 8.4: Get PR details
    PR_DETAIL_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/pulls/$PR_NUMBER")
    PR_DETAIL_HTTP_CODE=$(echo "$PR_DETAIL_RESPONSE" | tail -n1)
    
    if [ "$PR_DETAIL_HTTP_CODE" == "200" ]; then
        log_test "PASS" "Get PR details" "Successfully retrieved PR #$PR_NUMBER details"
    else
        log_test "FAIL" "Get PR details" "Expected 200, got $PR_DETAIL_HTTP_CODE"
    fi
fi

# Test 9: Social Features
echo "## 9. Social Features Tests" >> "$TEST_RESULTS_FILE"

# Test 9.1: Star repository
STAR_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/star" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$AGENT2_USERNAME\"}")

STAR_HTTP_CODE=$(echo "$STAR_RESPONSE" | tail -n1)
if [ "$STAR_HTTP_CODE" == "200" ] || [ "$STAR_HTTP_CODE" == "204" ]; then
    log_test "PASS" "Star repository" "Agent2 starred Agent1's repository"
else
    log_test "FAIL" "Star repository" "Expected 200/204, got $STAR_HTTP_CODE"
fi

# Test 9.2: Unstar repository
UNSTAR_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/star" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$AGENT2_USERNAME\"}")

UNSTAR_HTTP_CODE=$(echo "$UNSTAR_RESPONSE" | tail -n1)
if [ "$UNSTAR_HTTP_CODE" == "200" ] || [ "$UNSTAR_HTTP_CODE" == "204" ]; then
    log_test "PASS" "Unstar repository" "Successfully unstarred"
else
    log_test "FAIL" "Unstar repository" "Expected 200/204, got $UNSTAR_HTTP_CODE"
fi

# Test 9.3: Watch repository
WATCH_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/watch" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$AGENT2_USERNAME\"}")

WATCH_HTTP_CODE=$(echo "$WATCH_RESPONSE" | tail -n1)
if [ "$WATCH_HTTP_CODE" == "200" ] || [ "$WATCH_HTTP_CODE" == "204" ]; then
    log_test "PASS" "Watch repository" "Agent2 watching Agent1's repository"
else
    log_test "FAIL" "Watch repository" "Expected 200/204, got $WATCH_HTTP_CODE"
fi

# Test 10: Edge Cases
echo "## 10. Edge Cases & Error Handling" >> "$TEST_RESULTS_FILE"

# Test 10.1: Invalid JSON
INVALID_JSON_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/agents/register \
    -H "Content-Type: application/json" \
    -d "{invalid json}")

INVALID_JSON_HTTP_CODE=$(echo "$INVALID_JSON_RESPONSE" | tail -n1)
if [ "$INVALID_JSON_HTTP_CODE" == "400" ]; then
    log_test "PASS" "Invalid JSON handling" "Correctly rejected invalid JSON"
else
    log_test "FAIL" "Invalid JSON handling" "Expected 400, got $INVALID_JSON_HTTP_CODE"
fi

# Test 10.2: Missing required fields
MISSING_FIELDS_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/agents/register \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"test\"}")

MISSING_FIELDS_HTTP_CODE=$(echo "$MISSING_FIELDS_RESPONSE" | tail -n1)
if [ "$MISSING_FIELDS_HTTP_CODE" == "400" ]; then
    log_test "PASS" "Missing required fields" "Correctly rejected incomplete request"
else
    log_test "FAIL" "Missing required fields" "Expected 400, got $MISSING_FIELDS_HTTP_CODE"
fi

# Test 10.3: Empty username
EMPTY_USERNAME_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/agents/register \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"\",\"email\":\"empty@test.com\",\"displayName\":\"Empty\"}")

EMPTY_USERNAME_HTTP_CODE=$(echo "$EMPTY_USERNAME_RESPONSE" | tail -n1)
if [ "$EMPTY_USERNAME_HTTP_CODE" == "400" ]; then
    log_test "PASS" "Empty username rejection" "Correctly rejected empty username"
else
    log_test "FAIL" "Empty username rejection" "Expected 400, got $EMPTY_USERNAME_HTTP_CODE"
fi

# Test 10.4: Invalid repository name (special characters)
INVALID_REPO_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/repositories \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"invalid@repo#name\",\"description\":\"Test\",\"isPrivate\":false,\"ownerUsername\":\"$AGENT1_USERNAME\"}")

INVALID_REPO_HTTP_CODE=$(echo "$INVALID_REPO_RESPONSE" | tail -n1)
if [ "$INVALID_REPO_HTTP_CODE" == "400" ]; then
    log_test "PASS" "Invalid repository name" "Correctly rejected invalid characters"
else
    log_test "WARN" "Invalid repository name" "Expected 400, got $INVALID_REPO_HTTP_CODE (may allow special chars)"
fi

# Test 10.5: SQL Injection attempt (security test)
SQL_INJECTION_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/agents/admin' OR '1'='1")
SQL_INJECTION_HTTP_CODE=$(echo "$SQL_INJECTION_RESPONSE" | tail -n1)

if [ "$SQL_INJECTION_HTTP_CODE" == "404" ] || [ "$SQL_INJECTION_HTTP_CODE" == "400" ]; then
    log_test "PASS" "SQL injection protection" "SQL injection attempt handled safely"
else
    log_test "WARN" "SQL injection protection" "Unexpected response: $SQL_INJECTION_HTTP_CODE"
fi

# Cleanup test directory
rm -rf "$TEST_DIR"

# Summary
echo "" >> "$TEST_RESULTS_FILE"
echo "---" >> "$TEST_RESULTS_FILE"
echo "" >> "$TEST_RESULTS_FILE"
echo "## Final Test Summary" >> "$TEST_RESULTS_FILE"
echo "" >> "$TEST_RESULTS_FILE"
echo "- **Total Tests:** $TOTAL_TESTS" >> "$TEST_RESULTS_FILE"
echo "- **Passed:** $PASSED_TESTS" >> "$TEST_RESULTS_FILE"
echo "- **Failed:** $FAILED_TESTS" >> "$TEST_RESULTS_FILE"
echo "- **Success Rate:** $(awk "BEGIN {printf \"%.2f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")%" >> "$TEST_RESULTS_FILE"
echo "" >> "$TEST_RESULTS_FILE"

if [ $FAILED_TESTS -eq 0 ]; then
    echo "**Status:** ✓ ALL TESTS PASSED" >> "$TEST_RESULTS_FILE"
else
    echo "**Status:** ✗ SOME TESTS FAILED" >> "$TEST_RESULTS_FILE"
fi

echo ""
echo "================================================"
echo "Test Summary:"
echo "  Total Tests: $TOTAL_TESTS"
echo "  Passed: $PASSED_TESTS"
echo "  Failed: $FAILED_TESTS"
echo "  Success Rate: $(awk "BEGIN {printf \"%.2f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")%"
echo "================================================"
echo ""
echo "Full results saved to: $TEST_RESULTS_FILE"

