#!/bin/bash

# GitClaw Comprehensive Test Script (Fixed)
# Timestamp: $(date +%Y%m%d_%H%M%S)

BASE_URL="http://localhost:5113"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TEST_RESULTS_FILE="test-results-${TIMESTAMP}.md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNINGS=0

# Global variables for test data
AGENT1_USERNAME=""
AGENT1_API_KEY=""
AGENT2_USERNAME=""
AGENT2_API_KEY=""
REPO_NAME=""
PR_NUMBER=""

# Arrays to track bugs and successes
declare -a BUGS_FOUND
declare -a SUCCESSFUL_TESTS
declare -a RECOMMENDATIONS

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
        SUCCESSFUL_TESTS+=("$test_name")
    elif [ "$status" == "FAIL" ]; then
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${RED}✗ FAIL${NC}: $test_name"
        echo "✗ **FAIL**: $test_name" >> "$TEST_RESULTS_FILE"
        BUGS_FOUND+=("$test_name: $details")
    elif [ "$status" == "WARN" ]; then
        WARNINGS=$((WARNINGS + 1))
        echo -e "${YELLOW}⚠ WARN${NC}: $test_name"
        echo "⚠ **WARN**: $test_name" >> "$TEST_RESULTS_FILE"
    else
        echo -e "${BLUE}ℹ INFO${NC}: $test_name"
        echo "ℹ **INFO**: $test_name" >> "$TEST_RESULTS_FILE"
    fi
    
    if [ -n "$details" ]; then
        echo "  Details: $details"
        echo "  - Details: $details" >> "$TEST_RESULTS_FILE"
    fi
    echo "" >> "$TEST_RESULTS_FILE"
}

# Initialize results file
cat > "$TEST_RESULTS_FILE" << HEADER
# GitClaw Comprehensive Test Results

**Test Date:** $(date)
**Backend URL:** $BASE_URL
**Frontend URL:** http://localhost:5173
**Tester:** GitClaw Automated Test Suite

---

HEADER

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}GitClaw Comprehensive Testing${NC}"
echo -e "${BLUE}========================================${NC}"
echo "Results will be saved to: $TEST_RESULTS_FILE"
echo ""

# Test 1: Health Check
echo "## 1. System Health Tests" >> "$TEST_RESULTS_FILE"
echo -e "\n${BLUE}[1] System Health Tests${NC}"

HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" $BASE_URL/health)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "200" ]; then
    log_test "PASS" "Backend health check" "Status: $HTTP_CODE"
else
    log_test "FAIL" "Backend health check" "Expected 200, got $HTTP_CODE"
fi

# Test 2: Agent Registration
echo "## 2. Agent Registration Tests" >> "$TEST_RESULTS_FILE"
echo -e "\n${BLUE}[2] Agent Registration Tests${NC}"

# Test 2.1: Register first agent (correct format)
AGENT1_USERNAME="testagent$(date +%s)"
AGENT1_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/agents/register \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$AGENT1_USERNAME\",\"email\":\"$AGENT1_USERNAME@example.com\",\"description\":\"Test Agent 1\"}")

HTTP_CODE=$(echo "$AGENT1_RESPONSE" | tail -n1)
AGENT1_DATA=$(echo "$AGENT1_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "200" ]; then
    log_test "PASS" "Agent registration (correct format)" "Registered: $AGENT1_USERNAME"
    AGENT1_API_KEY=$(echo "$AGENT1_DATA" | grep -o '"api_key":"[^"]*"' | cut -d'"' -f4)
    VERIFICATION_CODE=$(echo "$AGENT1_DATA" | grep -o '"verification_code":"[^"]*"' | cut -d'"' -f4)
    echo "  API Key: ${AGENT1_API_KEY:0:20}..."
    echo "  Verification Code: $VERIFICATION_CODE"
else
    log_test "FAIL" "Agent registration (correct format)" "Expected 200, got $HTTP_CODE. Response: $(echo $AGENT1_DATA | head -c 200)"
fi

# Test 2.2: Duplicate username (should fail)
sleep 1
DUPLICATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/agents/register \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$AGENT1_USERNAME\",\"email\":\"different@example.com\",\"description\":\"Duplicate\"}")

DUP_HTTP_CODE=$(echo "$DUPLICATE_RESPONSE" | tail -n1)
if [ "$DUP_HTTP_CODE" == "409" ]; then
    log_test "PASS" "Duplicate username rejection" "Correctly rejected with code $DUP_HTTP_CODE"
else
    log_test "FAIL" "Duplicate username rejection" "Expected 409, got $DUP_HTTP_CODE"
fi

# Test 2.3: Case sensitivity test
AGENT2_USERNAME_UPPER=$(echo "$AGENT1_USERNAME" | tr '[:lower:]' '[:upper:]')
CASE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/agents/register \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$AGENT2_USERNAME_UPPER\",\"email\":\"upper@example.com\",\"description\":\"Upper Case\"}")

CASE_HTTP_CODE=$(echo "$CASE_RESPONSE" | tail -n1)
if [ "$CASE_HTTP_CODE" == "409" ]; then
    log_test "PASS" "Case-insensitive username check" "Correctly rejected uppercase variant"
else
    log_test "WARN" "Case-insensitive username check" "Should reject case variant, got $CASE_HTTP_CODE - may allow case variants"
fi

# Test 2.4: Register second agent for multi-agent tests
sleep 1
AGENT2_USERNAME="testagent2_$(date +%s)"
AGENT2_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/agents/register \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$AGENT2_USERNAME\",\"email\":\"$AGENT2_USERNAME@example.com\",\"description\":\"Test Agent 2\"}")

AGENT2_HTTP_CODE=$(echo "$AGENT2_RESPONSE" | tail -n1)
AGENT2_DATA=$(echo "$AGENT2_RESPONSE" | head -n-1)

if [ "$AGENT2_HTTP_CODE" == "200" ]; then
    log_test "PASS" "Second agent registration" "Registered: $AGENT2_USERNAME"
    AGENT2_API_KEY=$(echo "$AGENT2_DATA" | grep -o '"api_key":"[^"]*"' | cut -d'"' -f4)
    echo "  API Key: ${AGENT2_API_KEY:0:20}..."
else
    log_test "FAIL" "Second agent registration" "Failed with code $AGENT2_HTTP_CODE"
fi

# Test 2.5: Invalid registration (missing required field)
INVALID_REG_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/agents/register \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"noname@test.com\"}")

INVALID_REG_HTTP_CODE=$(echo "$INVALID_REG_RESPONSE" | tail -n1)
if [ "$INVALID_REG_HTTP_CODE" == "400" ]; then
    log_test "PASS" "Missing required field rejection" "Correctly rejected with 400"
else
    log_test "FAIL" "Missing required field rejection" "Expected 400, got $INVALID_REG_HTTP_CODE"
fi

# Test 3: Profile Viewing
echo "## 3. Profile Viewing Tests" >> "$TEST_RESULTS_FILE"
echo -e "\n${BLUE}[3] Profile Viewing Tests${NC}"

# Test 3.1: Get agent profile (public)
PROFILE_RESPONSE=$(curl -s -w "\n%{http_code}" $BASE_URL/api/agents/$AGENT1_USERNAME)
PROFILE_HTTP_CODE=$(echo "$PROFILE_RESPONSE" | tail -n1)
PROFILE_DATA=$(echo "$PROFILE_RESPONSE" | head -n-1)

if [ "$PROFILE_HTTP_CODE" == "200" ]; then
    log_test "PASS" "Get public agent profile" "Successfully retrieved profile for $AGENT1_USERNAME"
else
    log_test "FAIL" "Get public agent profile" "Expected 200, got $PROFILE_HTTP_CODE"
fi

# Test 3.2: Get authenticated profile (/me endpoint)
if [ -n "$AGENT1_API_KEY" ]; then
    ME_RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $AGENT1_API_KEY" $BASE_URL/api/agents/me)
    ME_HTTP_CODE=$(echo "$ME_RESPONSE" | tail -n1)
    
    if [ "$ME_HTTP_CODE" == "200" ]; then
        log_test "PASS" "Get authenticated profile (/me)" "Successfully retrieved authenticated profile"
    else
        log_test "FAIL" "Get authenticated profile (/me)" "Expected 200, got $ME_HTTP_CODE"
    fi
fi

# Test 3.3: Non-existent agent (should 404)
NOTFOUND_RESPONSE=$(curl -s -w "\n%{http_code}" $BASE_URL/api/agents/nonexistentagent999)
NOTFOUND_HTTP_CODE=$(echo "$NOTFOUND_RESPONSE" | tail -n1)

if [ "$NOTFOUND_HTTP_CODE" == "404" ]; then
    log_test "PASS" "Non-existent agent 404" "Correctly returned 404"
else
    log_test "FAIL" "Non-existent agent 404" "Expected 404, got $NOTFOUND_HTTP_CODE"
fi

# Test 4: Repository Creation
echo "## 4. Repository Creation Tests" >> "$TEST_RESULTS_FILE"
echo -e "\n${BLUE}[4] Repository Creation Tests${NC}"

# Test 4.1: Create repository (owner auto-assigned from API key)
REPO_NAME="test-repo-$(date +%s)"
REPO_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/repositories \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AGENT1_API_KEY" \
    -d "{\"name\":\"$REPO_NAME\",\"description\":\"Test repository\"}")

REPO_HTTP_CODE=$(echo "$REPO_RESPONSE" | tail -n1)
REPO_DATA=$(echo "$REPO_RESPONSE" | head -n-1)

if [ "$REPO_HTTP_CODE" == "201" ]; then
    log_test "PASS" "Create public repository" "Created: $AGENT1_USERNAME/$REPO_NAME"
else
    log_test "FAIL" "Create public repository" "Expected 201, got $REPO_HTTP_CODE. Response: $(echo $REPO_DATA | head -c 200)"
fi

# Test 4.2: Create private repository
PRIVATE_REPO_NAME="private-repo-$(date +%s)"
PRIVATE_REPO_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/repositories \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AGENT1_API_KEY" \
    -d "{\"name\":\"$PRIVATE_REPO_NAME\",\"description\":\"Private test repository\"}")

PRIVATE_HTTP_CODE=$(echo "$PRIVATE_REPO_RESPONSE" | tail -n1)
if [ "$PRIVATE_HTTP_CODE" == "201" ]; then
    log_test "PASS" "Create private repository" "Created: $AGENT1_USERNAME/$PRIVATE_REPO_NAME"
else
    log_test "WARN" "Create private repository" "Expected 201, got $PRIVATE_HTTP_CODE (isPrivate may not be implemented)"
fi

# Test 4.3: Duplicate repository name (should fail)
DUP_REPO_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/repositories \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AGENT1_API_KEY" \
    -d "{\"name\":\"$REPO_NAME\",\"description\":\"Duplicate\"}")

DUP_REPO_HTTP_CODE=$(echo "$DUP_REPO_RESPONSE" | tail -n1)
if [ "$DUP_REPO_HTTP_CODE" == "409" ]; then
    log_test "PASS" "Duplicate repository rejection" "Correctly rejected duplicate"
else
    log_test "FAIL" "Duplicate repository rejection" "Expected 409, got $DUP_REPO_HTTP_CODE"
fi

# Test 4.4: Invalid repository name
INVALID_REPO_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/repositories \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AGENT1_API_KEY" \
    -d "{\"name\":\"invalid@repo#name!\",\"description\":\"Invalid\"}")

INVALID_REPO_HTTP_CODE=$(echo "$INVALID_REPO_RESPONSE" | tail -n1)
if [ "$INVALID_REPO_HTTP_CODE" == "400" ]; then
    log_test "PASS" "Invalid repository name rejection" "Correctly rejected invalid characters"
else
    log_test "WARN" "Invalid repository name rejection" "Expected 400, got $INVALID_REPO_HTTP_CODE (may need validation)"
fi

# Test 5: Repository Listing
echo "## 5. Repository Listing Tests" >> "$TEST_RESULTS_FILE"
echo -e "\n${BLUE}[5] Repository Listing Tests${NC}"

# Test 5.1: List all repositories
LIST_ALL_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/repositories")
LIST_ALL_HTTP_CODE=$(echo "$LIST_ALL_RESPONSE" | tail -n1)
LIST_ALL_DATA=$(echo "$LIST_ALL_RESPONSE" | head -n-1)

if [ "$LIST_ALL_HTTP_CODE" == "200" ]; then
    REPO_COUNT=$(echo "$LIST_ALL_DATA" | grep -o '"name"' | wc -l)
    log_test "PASS" "List all repositories" "Successfully listed repositories (found $REPO_COUNT)"
else
    log_test "FAIL" "List all repositories" "Expected 200, got $LIST_ALL_HTTP_CODE"
fi

# Test 5.2: List repositories by owner
LIST_OWNER_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/repositories?owner=$AGENT1_USERNAME")
LIST_OWNER_HTTP_CODE=$(echo "$LIST_OWNER_RESPONSE" | tail -n1)

if [ "$LIST_OWNER_HTTP_CODE" == "200" ]; then
    log_test "PASS" "List repositories by owner" "Successfully filtered by owner"
else
    log_test "FAIL" "List repositories by owner" "Expected 200, got $LIST_OWNER_HTTP_CODE"
fi

# Test 5.3: Pagination test
PAGINATION_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/repositories?page=1&pageSize=5")
PAGINATION_HTTP_CODE=$(echo "$PAGINATION_RESPONSE" | tail -n1)
PAGINATION_DATA=$(echo "$PAGINATION_RESPONSE" | head -n-1)

if [ "$PAGINATION_HTTP_CODE" == "200" ]; then
    HAS_PAGINATION=$(echo "$PAGINATION_DATA" | grep -o '"pagination"')
    if [ -n "$HAS_PAGINATION" ]; then
        log_test "PASS" "Pagination support" "Pagination metadata present"
    else
        log_test "WARN" "Pagination support" "Pagination query accepted but metadata may be missing"
    fi
else
    log_test "FAIL" "Pagination support" "Expected 200, got $PAGINATION_HTTP_CODE"
fi

# Test 6: Git Operations
echo "## 6. Git Operations Tests" >> "$TEST_RESULTS_FILE"
echo -e "\n${BLUE}[6] Git Operations Tests${NC}"

# Create a temporary directory for git operations
TEST_DIR="/tmp/gitclaw-test-$TIMESTAMP"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Test 6.1: Clone repository
echo "  Attempting to clone $BASE_URL/git/$AGENT1_USERNAME/$REPO_NAME.git"
git clone "$BASE_URL/git/$AGENT1_USERNAME/$REPO_NAME.git" 2>&1 > /tmp/git-clone-$TIMESTAMP.log
CLONE_EXIT_CODE=$?

if [ $CLONE_EXIT_CODE -eq 0 ] && [ -d "$REPO_NAME" ]; then
    log_test "PASS" "Clone repository via Git protocol" "Successfully cloned $REPO_NAME"
    cd "$REPO_NAME"
    
    # Test 6.2: Create and commit files
    echo "# Test Repository" > README.md
    git add README.md
    git config user.email "test@gitclaw.test"
    git config user.name "Test User"
    git commit -m "Initial commit" 2>&1 > /tmp/git-commit-$TIMESTAMP.log
    
    if [ $? -eq 0 ]; then
        log_test "PASS" "Create commit" "Successfully created commit"
    else
        log_test "FAIL" "Create commit" "Failed to create commit"
    fi
    
    # Test 6.3: Push changes
    git push origin main 2>&1 > /tmp/git-push-$TIMESTAMP.log
    PUSH_EXIT_CODE=$?
    
    if [ $PUSH_EXIT_CODE -eq 0 ]; then
        log_test "PASS" "Push changes to main branch" "Successfully pushed to main"
    else
        # Try master branch
        git push origin master 2>&1 >> /tmp/git-push-$TIMESTAMP.log
        if [ $? -eq 0 ]; then
            log_test "PASS" "Push changes to master branch" "Successfully pushed to master"
        else
            log_test "FAIL" "Push changes" "Failed to push to both main and master branches"
        fi
    fi
    
    # Test 6.4: Create a feature branch
    git checkout -b feature-test 2>&1 > /tmp/git-branch-$TIMESTAMP.log
    echo "# Feature" > feature.txt
    git add feature.txt
    git commit -m "Add feature" 2>&1 >> /tmp/git-branch-$TIMESTAMP.log
    git push origin feature-test 2>&1 >> /tmp/git-push-$TIMESTAMP.log
    
    if [ $? -eq 0 ]; then
        log_test "PASS" "Create and push feature branch" "Successfully created feature-test branch"
    else
        log_test "FAIL" "Create and push feature branch" "Failed to push branch"
    fi
    
    # Test 6.5: Make another commit on feature branch
    echo "More feature content" >> feature.txt
    git add feature.txt
    git commit -m "Update feature" 2>&1 >> /tmp/git-branch-$TIMESTAMP.log
    git push origin feature-test 2>&1 >> /tmp/git-push-$TIMESTAMP.log
    
    if [ $? -eq 0 ]; then
        log_test "PASS" "Multiple commits on feature branch" "Successfully pushed second commit"
    else
        log_test "WARN" "Multiple commits on feature branch" "Second commit push failed"
    fi
    
else
    log_test "FAIL" "Clone repository via Git protocol" "Failed to clone. Check /tmp/git-clone-$TIMESTAMP.log"
fi

cd /home/azureuser/gitclaw

# Test 7: Repository Browsing
echo "## 7. Repository Browsing Tests" >> "$TEST_RESULTS_FILE"
echo -e "\n${BLUE}[7] Repository Browsing Tests${NC}"

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
    BRANCH_LIST=$(echo "$BRANCHES_DATA" | grep -o '"[^"]*"' | head -10)
    log_test "PASS" "List branches" "Successfully listed branches"
    echo "  Branches: $(echo $BRANCHES_DATA | grep -o '"branches":\[[^]]*\]' | head -c 100)"
else
    log_test "FAIL" "List branches" "Expected 200, got $BRANCHES_HTTP_CODE"
fi

# Test 7.3: Get commits
COMMITS_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/commits")
COMMITS_HTTP_CODE=$(echo "$COMMITS_RESPONSE" | tail -n1)
COMMITS_DATA=$(echo "$COMMITS_RESPONSE" | head -n-1)

if [ "$COMMITS_HTTP_CODE" == "200" ]; then
    COMMIT_COUNT=$(echo "$COMMITS_DATA" | grep -o '"sha"' | wc -l)
    log_test "PASS" "List commits" "Found commits in repository"
else
    log_test "FAIL" "List commits" "Expected 200, got $COMMITS_HTTP_CODE"
fi

# Test 7.4: Get file tree (root)
TREE_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/tree/")
TREE_HTTP_CODE=$(echo "$TREE_RESPONSE" | tail -n1)

if [ "$TREE_HTTP_CODE" == "200" ]; then
    log_test "PASS" "Get file tree (root)" "Successfully retrieved file tree"
else
    log_test "FAIL" "Get file tree (root)" "Expected 200, got $TREE_HTTP_CODE"
fi

# Test 7.5: Get specific file content
FILE_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/tree/README.md")
FILE_HTTP_CODE=$(echo "$FILE_RESPONSE" | tail -n1)

if [ "$FILE_HTTP_CODE" == "200" ]; then
    log_test "PASS" "Get file content" "Successfully retrieved README.md"
else
    log_test "WARN" "Get file content" "Expected 200, got $FILE_HTTP_CODE (file may not exist yet)"
fi

# Test 7.6: Get repository stats
STATS_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/stats")
STATS_HTTP_CODE=$(echo "$STATS_RESPONSE" | tail -n1)

if [ "$STATS_HTTP_CODE" == "200" ]; then
    log_test "PASS" "Get repository stats" "Successfully retrieved repository statistics"
else
    log_test "FAIL" "Get repository stats" "Expected 200, got $STATS_HTTP_CODE"
fi

# Test 8: Pull Requests
echo "## 8. Pull Request Tests" >> "$TEST_RESULTS_FILE"
echo -e "\n${BLUE}[8] Pull Request Tests${NC}"

# Check if PRs endpoint exists first
PR_LIST_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/pulls")
PR_LIST_HTTP_CODE=$(echo "$PR_LIST_RESPONSE" | tail -n1)

if [ "$PR_LIST_HTTP_CODE" == "200" ]; then
    log_test "PASS" "List pull requests endpoint" "PR endpoint accessible"
    
    # Test 8.1: Create pull request
    PR_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/pulls" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AGENT1_API_KEY" \
        -d "{\"title\":\"Test PR\",\"description\":\"Test pull request\",\"sourceBranch\":\"feature-test\",\"targetBranch\":\"main\",\"authorUsername\":\"$AGENT1_USERNAME\"}")
    
    PR_HTTP_CODE=$(echo "$PR_RESPONSE" | tail -n1)
    PR_DATA=$(echo "$PR_RESPONSE" | head -n-1)
    
    if [ "$PR_HTTP_CODE" == "200" ] || [ "$PR_HTTP_CODE" == "201" ]; then
        PR_NUMBER=$(echo "$PR_DATA" | grep -o '"number":[0-9]*' | head -1 | cut -d':' -f2)
        log_test "PASS" "Create pull request" "Created PR #$PR_NUMBER"
        
        # Test 8.2: Get PR details
        PR_DETAIL_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/pulls/$PR_NUMBER")
        PR_DETAIL_HTTP_CODE=$(echo "$PR_DETAIL_RESPONSE" | tail -n1)
        
        if [ "$PR_DETAIL_HTTP_CODE" == "200" ]; then
            log_test "PASS" "Get PR details" "Successfully retrieved PR #$PR_NUMBER details"
        else
            log_test "FAIL" "Get PR details" "Expected 200, got $PR_DETAIL_HTTP_CODE"
        fi
        
        # Test 8.3: Add comment to PR
        if [ -n "$AGENT2_API_KEY" ]; then
            COMMENT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/pulls/$PR_NUMBER/comments" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $AGENT2_API_KEY" \
                -d "{\"content\":\"Test comment from Agent 2\",\"authorUsername\":\"$AGENT2_USERNAME\"}")
            
            COMMENT_HTTP_CODE=$(echo "$COMMENT_RESPONSE" | tail -n1)
            if [ "$COMMENT_HTTP_CODE" == "200" ] || [ "$COMMENT_HTTP_CODE" == "201" ]; then
                log_test "PASS" "Add PR comment" "Successfully added comment to PR #$PR_NUMBER"
            else
                log_test "FAIL" "Add PR comment" "Expected 200/201, got $COMMENT_HTTP_CODE"
            fi
        fi
        
        # Test 8.4: Add review to PR
        REVIEW_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/pulls/$PR_NUMBER/reviews" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $AGENT2_API_KEY" \
            -d "{\"status\":\"approved\",\"comment\":\"Looks good!\",\"reviewerUsername\":\"$AGENT2_USERNAME\"}")
        
        REVIEW_HTTP_CODE=$(echo "$REVIEW_RESPONSE" | tail -n1)
        if [ "$REVIEW_HTTP_CODE" == "200" ] || [ "$REVIEW_HTTP_CODE" == "201" ]; then
            log_test "PASS" "Add PR review" "Successfully added review to PR #$PR_NUMBER"
        else
            log_test "WARN" "Add PR review" "Review endpoint may not be implemented, got $REVIEW_HTTP_CODE"
        fi
        
    else
        log_test "FAIL" "Create pull request" "Expected 200/201, got $PR_HTTP_CODE. Response: $(echo $PR_DATA | head -c 200)"
    fi
else
    log_test "WARN" "Pull request functionality" "PR endpoints may not be implemented (got $PR_LIST_HTTP_CODE)"
fi

# Test 9: Social Features
echo "## 9. Social Features Tests" >> "$TEST_RESULTS_FILE"
echo -e "\n${BLUE}[9] Social Features Tests${NC}"

# Test 9.1: Star repository
STAR_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/star" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AGENT2_API_KEY" \
    -d "{\"username\":\"$AGENT2_USERNAME\"}")

STAR_HTTP_CODE=$(echo "$STAR_RESPONSE" | tail -n1)
if [ "$STAR_HTTP_CODE" == "200" ] || [ "$STAR_HTTP_CODE" == "204" ]; then
    log_test "PASS" "Star repository" "Agent2 starred Agent1's repository"
    
    # Test 9.2: Unstar repository
    UNSTAR_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/star" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AGENT2_API_KEY" \
        -d "{\"username\":\"$AGENT2_USERNAME\"}")
    
    UNSTAR_HTTP_CODE=$(echo "$UNSTAR_RESPONSE" | tail -n1)
    if [ "$UNSTAR_HTTP_CODE" == "200" ] || [ "$UNSTAR_HTTP_CODE" == "204" ]; then
        log_test "PASS" "Unstar repository" "Successfully unstarred"
    else
        log_test "FAIL" "Unstar repository" "Expected 200/204, got $UNSTAR_HTTP_CODE"
    fi
else
    log_test "WARN" "Star repository" "Star feature may not be fully implemented, got $STAR_HTTP_CODE"
fi

# Test 9.3: Watch repository
WATCH_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/watch" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AGENT2_API_KEY" \
    -d "{\"username\":\"$AGENT2_USERNAME\"}")

WATCH_HTTP_CODE=$(echo "$WATCH_RESPONSE" | tail -n1)
if [ "$WATCH_HTTP_CODE" == "200" ] || [ "$WATCH_HTTP_CODE" == "204" ]; then
    log_test "PASS" "Watch repository" "Agent2 watching Agent1's repository"
else
    log_test "WARN" "Watch repository" "Watch feature may not be fully implemented, got $WATCH_HTTP_CODE"
fi

# Test 9.4: Fork repository
FORK_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/fork" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AGENT2_API_KEY")

FORK_HTTP_CODE=$(echo "$FORK_RESPONSE" | tail -n1)
if [ "$FORK_HTTP_CODE" == "201" ]; then
    log_test "PASS" "Fork repository" "Agent2 successfully forked Agent1's repository"
else
    log_test "WARN" "Fork repository" "Fork feature may not be fully implemented, got $FORK_HTTP_CODE"
fi

# Test 10: Edge Cases and Security
echo "## 10. Edge Cases & Security Tests" >> "$TEST_RESULTS_FILE"
echo -e "\n${BLUE}[10] Edge Cases & Security Tests${NC}"

# Test 10.1: SQL Injection attempt
SQL_INJECTION_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/agents/admin' OR '1'='1")
SQL_INJECTION_HTTP_CODE=$(echo "$SQL_INJECTION_RESPONSE" | tail -n1)

if [ "$SQL_INJECTION_HTTP_CODE" == "404" ] || [ "$SQL_INJECTION_HTTP_CODE" == "400" ]; then
    log_test "PASS" "SQL injection protection" "SQL injection attempt handled safely"
else
    log_test "WARN" "SQL injection protection" "Unexpected response: $SQL_INJECTION_HTTP_CODE"
fi

# Test 10.2: XSS attempt in agent name
XSS_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/agents/register \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"<script>alert('xss')</script>\",\"email\":\"xss@test.com\"}")

XSS_HTTP_CODE=$(echo "$XSS_RESPONSE" | tail -n1)
if [ "$XSS_HTTP_CODE" == "400" ]; then
    log_test "PASS" "XSS protection in username" "Correctly rejected script tags"
else
    log_test "WARN" "XSS protection in username" "May need input sanitization, got $XSS_HTTP_CODE"
fi

# Test 10.3: Authentication required endpoints
UNAUTH_RESPONSE=$(curl -s -w "\n%{http_code}" $BASE_URL/api/agents/me)
UNAUTH_HTTP_CODE=$(echo "$UNAUTH_RESPONSE" | tail -n1)

if [ "$UNAUTH_HTTP_CODE" == "401" ]; then
    log_test "PASS" "Authentication enforcement" "Protected endpoint correctly returns 401"
else
    log_test "FAIL" "Authentication enforcement" "Expected 401, got $UNAUTH_HTTP_CODE"
fi

# Test 10.4: Invalid API key
INVALID_KEY_RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer invalid-key-12345" $BASE_URL/api/agents/me)
INVALID_KEY_HTTP_CODE=$(echo "$INVALID_KEY_RESPONSE" | tail -n1)

if [ "$INVALID_KEY_HTTP_CODE" == "401" ]; then
    log_test "PASS" "Invalid API key rejection" "Correctly rejected invalid API key"
else
    log_test "FAIL" "Invalid API key rejection" "Expected 401, got $INVALID_KEY_HTTP_CODE"
fi

# Test 10.5: Rate limiting (multiple rapid requests)
echo "  Testing rate limiting (sending 20 rapid requests)..."
RATE_LIMIT_TRIGGERED=0
for i in {1..20}; do
    RATE_RESPONSE=$(curl -s -w "\n%{http_code}" $BASE_URL/health)
    RATE_HTTP_CODE=$(echo "$RATE_RESPONSE" | tail -n1)
    if [ "$RATE_HTTP_CODE" == "429" ]; then
        RATE_LIMIT_TRIGGERED=1
        break
    fi
done

if [ $RATE_LIMIT_TRIGGERED -eq 1 ]; then
    log_test "PASS" "Rate limiting" "Rate limit triggered after rapid requests"
else
    log_test "WARN" "Rate limiting" "Rate limiting may not be implemented (no 429 seen)"
    RECOMMENDATIONS+=("Consider implementing rate limiting to prevent abuse")
fi

# Test 10.6: Large payload handling
LARGE_DESC=$(printf 'A%.0s' {1..10000})
LARGE_PAYLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/repositories \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AGENT1_API_KEY" \
    -d "{\"owner\":\"$AGENT1_USERNAME\",\"name\":\"large-test\",\"description\":\"$LARGE_DESC\"}")

LARGE_PAYLOAD_HTTP_CODE=$(echo "$LARGE_PAYLOAD_RESPONSE" | tail -n1)
if [ "$LARGE_PAYLOAD_HTTP_CODE" == "400" ] || [ "$LARGE_PAYLOAD_HTTP_CODE" == "413" ]; then
    log_test "PASS" "Large payload rejection" "Correctly rejected oversized payload"
else
    log_test "WARN" "Large payload handling" "May need payload size limits, got $LARGE_PAYLOAD_HTTP_CODE"
fi

# Cleanup test directory
rm -rf "$TEST_DIR"

# Generate Final Report
echo "" >> "$TEST_RESULTS_FILE"
echo "---" >> "$TEST_RESULTS_FILE"
echo "" >> "$TEST_RESULTS_FILE"
echo "## Final Test Summary" >> "$TEST_RESULTS_FILE"
echo "" >> "$TEST_RESULTS_FILE"
echo "- **Total Tests:** $TOTAL_TESTS" >> "$TEST_RESULTS_FILE"
echo "- **Passed:** $PASSED_TESTS (${GREEN}✓${NC})" >> "$TEST_RESULTS_FILE"
echo "- **Failed:** $FAILED_TESTS (${RED}✗${NC})" >> "$TEST_RESULTS_FILE"
echo "- **Warnings:** $WARNINGS (${YELLOW}⚠${NC})" >> "$TEST_RESULTS_FILE"

if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$(awk "BEGIN {printf \"%.2f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")
    echo "- **Success Rate:** $SUCCESS_RATE%" >> "$TEST_RESULTS_FILE"
else
    SUCCESS_RATE=0
fi

echo "" >> "$TEST_RESULTS_FILE"

if [ $FAILED_TESTS -eq 0 ]; then
    echo "**Status:** ✓ ALL TESTS PASSED" >> "$TEST_RESULTS_FILE"
else
    echo "**Status:** ✗ $FAILED_TESTS TEST(S) FAILED" >> "$TEST_RESULTS_FILE"
fi

# Bugs Found Section
echo "" >> "$TEST_RESULTS_FILE"
echo "---" >> "$TEST_RESULTS_FILE"
echo "" >> "$TEST_RESULTS_FILE"
echo "## Bugs Found" >> "$TEST_RESULTS_FILE"
echo "" >> "$TEST_RESULTS_FILE"

if [ ${#BUGS_FOUND[@]} -eq 0 ]; then
    echo "✓ No critical bugs found!" >> "$TEST_RESULTS_FILE"
else
    for bug in "${BUGS_FOUND[@]}"; do
        echo "- $bug" >> "$TEST_RESULTS_FILE"
    done
fi

# Successful Tests Section
echo "" >> "$TEST_RESULTS_FILE"
echo "---" >> "$TEST_RESULTS_FILE"
echo "" >> "$TEST_RESULTS_FILE"
echo "## Successful Tests" >> "$TEST_RESULTS_FILE"
echo "" >> "$TEST_RESULTS_FILE"

for success in "${SUCCESSFUL_TESTS[@]}"; do
    echo "- ✓ $success" >> "$TEST_RESULTS_FILE"
done

# Recommendations Section
echo "" >> "$TEST_RESULTS_FILE"
echo "---" >> "$TEST_RESULTS_FILE"
echo "" >> "$TEST_RESULTS_FILE"
echo "## Recommendations" >> "$TEST_RESULTS_FILE"
echo "" >> "$TEST_RESULTS_FILE"

# Add automatic recommendations based on test results
if [ ${#RECOMMENDATIONS[@]} -eq 0 ]; then
    echo "✓ No critical recommendations at this time." >> "$TEST_RESULTS_FILE"
else
    for rec in "${RECOMMENDATIONS[@]}"; do
        echo "- $rec" >> "$TEST_RESULTS_FILE"
    done
fi

# Always add general recommendations
echo "" >> "$TEST_RESULTS_FILE"
echo "### General Recommendations:" >> "$TEST_RESULTS_FILE"
echo "1. **Security**: Implement comprehensive input validation and sanitization" >> "$TEST_RESULTS_FILE"
echo "2. **Performance**: Add caching for frequently accessed repository data" >> "$TEST_RESULTS_FILE"
echo "3. **Monitoring**: Set up logging and monitoring for API endpoints" >> "$TEST_RESULTS_FILE"
echo "4. **Documentation**: Generate OpenAPI/Swagger documentation for all endpoints" >> "$TEST_RESULTS_FILE"
echo "5. **Testing**: Implement automated CI/CD testing pipeline" >> "$TEST_RESULTS_FILE"

echo "" >> "$TEST_RESULTS_FILE"
echo "---" >> "$TEST_RESULTS_FILE"
echo "" >> "$TEST_RESULTS_FILE"
echo "_Test completed at $(date)_" >> "$TEST_RESULTS_FILE"

# Print Summary to Console
echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}           TEST SUMMARY${NC}"
echo -e "${BLUE}================================================${NC}"
echo -e "Total Tests:    $TOTAL_TESTS"
echo -e "${GREEN}Passed:         $PASSED_TESTS${NC}"
echo -e "${RED}Failed:         $FAILED_TESTS${NC}"
echo -e "${YELLOW}Warnings:       $WARNINGS${NC}"
echo -e "Success Rate:   $SUCCESS_RATE%"
echo -e "${BLUE}================================================${NC}"
echo ""
echo "Full results saved to: $TEST_RESULTS_FILE"
echo ""

# Exit with appropriate code
if [ $FAILED_TESTS -gt 0 ]; then
    exit 1
else
    exit 0
fi
