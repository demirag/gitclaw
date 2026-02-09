#!/bin/bash

# GitClaw Comprehensive Test Script (Fixed)
# Timestamp: $(date +%Y%m%d_%H%M%S)

BASE_URL="${BASE_URL:-http://localhost:5113}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
# Resolve project root (repo root, parent of scripts/) so results file is stable regardless of cd
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_RESULTS_FILE="$PROJECT_ROOT/test-results-${TIMESTAMP}.md"

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
# Default branch on server (main or master) - set during clone/push so PR merge uses correct target
TARGET_BRANCH="main"

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
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)
BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

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

HTTP_CODE=$(echo "$AGENT1_RESPONSE" | tail -n 1)
AGENT1_DATA=$(echo "$AGENT1_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
    log_test "PASS" "Agent registration (correct format)" "Registered: $AGENT1_USERNAME"
    AGENT1_API_KEY=$(echo "$AGENT1_DATA" | jq -r '.agent.api_key // empty')
    VERIFICATION_CODE=$(echo "$AGENT1_DATA" | jq -r '.agent.verification_code // empty')
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

DUP_HTTP_CODE=$(echo "$DUPLICATE_RESPONSE" | tail -n 1)
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

CASE_HTTP_CODE=$(echo "$CASE_RESPONSE" | tail -n 1)
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

AGENT2_HTTP_CODE=$(echo "$AGENT2_RESPONSE" | tail -n 1)
AGENT2_DATA=$(echo "$AGENT2_RESPONSE" | sed '$d')

if [ "$AGENT2_HTTP_CODE" == "200" ]; then
    log_test "PASS" "Second agent registration" "Registered: $AGENT2_USERNAME"
    AGENT2_API_KEY=$(echo "$AGENT2_DATA" | jq -r '.agent.api_key // empty')
    echo "  API Key: ${AGENT2_API_KEY:0:20}..."
else
    log_test "FAIL" "Second agent registration" "Failed with code $AGENT2_HTTP_CODE"
fi

# Test 2.5: Invalid registration (missing required field)
INVALID_REG_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/agents/register \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"noname@test.com\"}")

INVALID_REG_HTTP_CODE=$(echo "$INVALID_REG_RESPONSE" | tail -n 1)
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
PROFILE_HTTP_CODE=$(echo "$PROFILE_RESPONSE" | tail -n 1)
PROFILE_DATA=$(echo "$PROFILE_RESPONSE" | sed '$d')

if [ "$PROFILE_HTTP_CODE" == "200" ]; then
    log_test "PASS" "Get public agent profile" "Successfully retrieved profile for $AGENT1_USERNAME"
else
    log_test "FAIL" "Get public agent profile" "Expected 200, got $PROFILE_HTTP_CODE"
fi

# Test 3.2: Get authenticated profile (/me endpoint)
if [ -n "$AGENT1_API_KEY" ]; then
    ME_RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $AGENT1_API_KEY" $BASE_URL/api/agents/me)
    ME_HTTP_CODE=$(echo "$ME_RESPONSE" | tail -n 1)
    
    if [ "$ME_HTTP_CODE" == "200" ]; then
        log_test "PASS" "Get authenticated profile (/me)" "Successfully retrieved authenticated profile"
    else
        log_test "FAIL" "Get authenticated profile (/me)" "Expected 200, got $ME_HTTP_CODE"
    fi
fi

# Test 3.3: Non-existent agent (should 404)
NOTFOUND_RESPONSE=$(curl -s -w "\n%{http_code}" $BASE_URL/api/agents/nonexistentagent999)
NOTFOUND_HTTP_CODE=$(echo "$NOTFOUND_RESPONSE" | tail -n 1)

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

REPO_HTTP_CODE=$(echo "$REPO_RESPONSE" | tail -n 1)
REPO_DATA=$(echo "$REPO_RESPONSE" | sed $d)

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

PRIVATE_HTTP_CODE=$(echo "$PRIVATE_REPO_RESPONSE" | tail -n 1)
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

DUP_REPO_HTTP_CODE=$(echo "$DUP_REPO_RESPONSE" | tail -n 1)
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

INVALID_REPO_HTTP_CODE=$(echo "$INVALID_REPO_RESPONSE" | tail -n 1)
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
LIST_ALL_HTTP_CODE=$(echo "$LIST_ALL_RESPONSE" | tail -n 1)
LIST_ALL_DATA=$(echo "$LIST_ALL_RESPONSE" | sed $d)

if [ "$LIST_ALL_HTTP_CODE" == "200" ]; then
    REPO_COUNT=$(echo "$LIST_ALL_DATA" | grep -o '"name"' | wc -l)
    log_test "PASS" "List all repositories" "Successfully listed repositories (found $REPO_COUNT)"
else
    log_test "FAIL" "List all repositories" "Expected 200, got $LIST_ALL_HTTP_CODE"
fi

# Test 5.2: List repositories by owner
LIST_OWNER_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/repositories?owner=$AGENT1_USERNAME")
LIST_OWNER_HTTP_CODE=$(echo "$LIST_OWNER_RESPONSE" | tail -n 1)

if [ "$LIST_OWNER_HTTP_CODE" == "200" ]; then
    log_test "PASS" "List repositories by owner" "Successfully filtered by owner"
else
    log_test "FAIL" "List repositories by owner" "Expected 200, got $LIST_OWNER_HTTP_CODE"
fi

# Test 5.3: Pagination test
PAGINATION_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/repositories?page=1&pageSize=5")
PAGINATION_HTTP_CODE=$(echo "$PAGINATION_RESPONSE" | tail -n 1)
PAGINATION_DATA=$(echo "$PAGINATION_RESPONSE" | sed $d)

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

# Test 6.1: Clone repository with authentication
# Format: http(s)://username:api_key@host/owner/repo.git
CLONE_URL=$(echo "$BASE_URL" | sed "s|https://|https://$AGENT1_USERNAME:$AGENT1_API_KEY@|;s|http://|http://$AGENT1_USERNAME:$AGENT1_API_KEY@|")
echo "  Attempting to clone $CLONE_URL/$AGENT1_USERNAME/$REPO_NAME.git"
git clone "$CLONE_URL/$AGENT1_USERNAME/$REPO_NAME.git" 2>&1 > /tmp/git-clone-$TIMESTAMP.log
CLONE_EXIT_CODE=$?

if [ $CLONE_EXIT_CODE -eq 0 ] && [ -d "$REPO_NAME" ]; then
    log_test "PASS" "Clone repository via Git protocol" "Successfully cloned $REPO_NAME"
    cd "$REPO_NAME"
    
    # Test 6.2: Create initial files on main branch
    cat > README.md << 'EOF'
# Test Repository

This is a test repository for GitClaw.

## Features
- Feature 1: Basic functionality
- Feature 2: Advanced features

## Installation
```bash
npm install
```

## Usage
Run the application with default settings.
EOF
    
    cat > config.json << 'EOF'
{
  "version": "1.0.0",
  "name": "test-app",
  "settings": {
    "debug": false,
    "port": 3000
  }
}
EOF
    
    git add README.md config.json
    git config user.email "test@gitclaw.test"
    git config user.name "Test User"
    git commit -m "Initial commit: Add README and config" 2>&1 > /tmp/git-commit-$TIMESTAMP.log
    
    if [ $? -eq 0 ]; then
        log_test "PASS" "Create initial commit" "Successfully created initial commit with multiple files"
    else
        log_test "FAIL" "Create initial commit" "Failed to create commit"
    fi
    
    # Normalize branch to main (clone of empty repo may create master depending on init.defaultBranch)
    git branch -M main
    
    # Test 6.3: Push changes to main branch
    git push -u origin main 2>&1 > /tmp/git-push-$TIMESTAMP.log
    PUSH_EXIT_CODE=$?
    
    if [ $PUSH_EXIT_CODE -eq 0 ]; then
        log_test "PASS" "Push changes to main branch" "Successfully pushed to main"
        TARGET_BRANCH="main"
    else
        # Try master branch (e.g. older git default)
        git push origin master 2>&1 >> /tmp/git-push-$TIMESTAMP.log
        if [ $? -eq 0 ]; then
            log_test "PASS" "Push changes to master branch" "Successfully pushed to master"
            TARGET_BRANCH="master"
        else
            log_test "FAIL" "Push changes" "Failed to push to both main and master branches"
        fi
    fi
    
    # Test 6.4: Create a feature branch and modify files
    git checkout -b feature-test 2>&1 > /tmp/git-branch-$TIMESTAMP.log
    
    # Modify README.md - add a new feature
    cat >> README.md << 'EOF'

## New Feature
This is a new feature added in the feature branch.

### Implementation Details
- Added new configuration option
- Enhanced debug mode
- Improved error handling
EOF
    
    # Modify config.json - enable debug and add new settings
    cat > config.json << 'EOF'
{
  "version": "1.1.0",
  "name": "test-app",
  "settings": {
    "debug": true,
    "port": 3000,
    "logLevel": "verbose",
    "features": {
      "newFeature": true
    }
  }
}
EOF
    
    # Add a new feature file
    cat > feature.js << 'EOF'
// New feature implementation
function newFeature() {
  console.log('Executing new feature...');
  return {
    status: 'success',
    message: 'Feature executed successfully'
  };
}

module.exports = { newFeature };
EOF
    
    git add README.md config.json feature.js
    git commit -m "Add new feature with enhanced configuration" 2>&1 >> /tmp/git-branch-$TIMESTAMP.log
    git push origin feature-test 2>&1 >> /tmp/git-push-$TIMESTAMP.log
    
    if [ $? -eq 0 ]; then
        log_test "PASS" "Create and push feature branch" "Successfully created feature-test branch with file modifications"
    else
        log_test "FAIL" "Create and push feature branch" "Failed to push branch"
    fi
    
    # Test 6.5: Make another commit on feature branch (refinement)
    cat >> feature.js << 'EOF'

// Additional helper function
function validateFeature() {
  return newFeature().status === 'success';
}

module.exports = { newFeature, validateFeature };
EOF
    
    git add feature.js
    git commit -m "Add feature validation helper" 2>&1 >> /tmp/git-branch-$TIMESTAMP.log
    git push origin feature-test 2>&1 >> /tmp/git-push-$TIMESTAMP.log
    
    if [ $? -eq 0 ]; then
        log_test "PASS" "Multiple commits on feature branch" "Successfully pushed refinement commit"
    else
        log_test "WARN" "Multiple commits on feature branch" "Second commit push failed"
    fi
    
    # Switch back to main for later tests
    git checkout main 2>&1 >> /tmp/git-branch-$TIMESTAMP.log
    
else
    log_test "FAIL" "Clone repository via Git protocol" "Failed to clone. Check /tmp/git-clone-$TIMESTAMP.log"
fi

cd "$PROJECT_ROOT"

# Test 7: Repository Browsing
echo "## 7. Repository Browsing Tests" >> "$TEST_RESULTS_FILE"
echo -e "\n${BLUE}[7] Repository Browsing Tests${NC}"

# Test 7.1: Get repository info
REPO_INFO_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME")
REPO_INFO_HTTP_CODE=$(echo "$REPO_INFO_RESPONSE" | tail -n 1)

if [ "$REPO_INFO_HTTP_CODE" == "200" ]; then
    log_test "PASS" "Get repository info" "Successfully retrieved repository info"
else
    log_test "FAIL" "Get repository info" "Expected 200, got $REPO_INFO_HTTP_CODE"
fi

# Test 7.2: Get branches
BRANCHES_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/branches")
BRANCHES_HTTP_CODE=$(echo "$BRANCHES_RESPONSE" | tail -n 1)
BRANCHES_DATA=$(echo "$BRANCHES_RESPONSE" | sed $d)

if [ "$BRANCHES_HTTP_CODE" == "200" ]; then
    BRANCH_LIST=$(echo "$BRANCHES_DATA" | grep -o '"[^"]*"' | head -10)
    log_test "PASS" "List branches" "Successfully listed branches"
    echo "  Branches: $(echo $BRANCHES_DATA | grep -o '"branches":\[[^]]*\]' | head -c 100)"
else
    log_test "FAIL" "List branches" "Expected 200, got $BRANCHES_HTTP_CODE"
fi

# Test 7.3: Get commits
COMMITS_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/commits")
COMMITS_HTTP_CODE=$(echo "$COMMITS_RESPONSE" | tail -n 1)
COMMITS_DATA=$(echo "$COMMITS_RESPONSE" | sed $d)

if [ "$COMMITS_HTTP_CODE" == "200" ]; then
    COMMIT_COUNT=$(echo "$COMMITS_DATA" | grep -o '"sha"' | wc -l)
    log_test "PASS" "List commits" "Found commits in repository"
else
    log_test "FAIL" "List commits" "Expected 200, got $COMMITS_HTTP_CODE"
fi

# Test 7.4: Get file tree (root)
TREE_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/tree/")
TREE_HTTP_CODE=$(echo "$TREE_RESPONSE" | tail -n 1)

if [ "$TREE_HTTP_CODE" == "200" ]; then
    log_test "PASS" "Get file tree (root)" "Successfully retrieved file tree"
else
    log_test "FAIL" "Get file tree (root)" "Expected 200, got $TREE_HTTP_CODE"
fi

# Test 7.5: Get specific file content
FILE_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/tree/README.md")
FILE_HTTP_CODE=$(echo "$FILE_RESPONSE" | tail -n 1)

if [ "$FILE_HTTP_CODE" == "200" ]; then
    log_test "PASS" "Get file content" "Successfully retrieved README.md"
else
    log_test "WARN" "Get file content" "Expected 200, got $FILE_HTTP_CODE (file may not exist yet)"
fi

# Test 7.6: Get repository stats
STATS_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/stats")
STATS_HTTP_CODE=$(echo "$STATS_RESPONSE" | tail -n 1)

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
PR_LIST_HTTP_CODE=$(echo "$PR_LIST_RESPONSE" | tail -n 1)

if [ "$PR_LIST_HTTP_CODE" == "200" ]; then
    log_test "PASS" "List pull requests endpoint" "PR endpoint accessible"
    
    # Test 8.1: Create pull request
    PR_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/pulls" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AGENT1_API_KEY" \
        -d "{\"title\":\"Test PR\",\"description\":\"Test pull request\",\"sourceBranch\":\"feature-test\",\"targetBranch\":\"$TARGET_BRANCH\",\"authorUsername\":\"$AGENT1_USERNAME\"}")
    
    PR_HTTP_CODE=$(echo "$PR_RESPONSE" | tail -n 1)
    PR_DATA=$(echo "$PR_RESPONSE" | sed $d)
    
    if [ "$PR_HTTP_CODE" == "200" ] || [ "$PR_HTTP_CODE" == "201" ]; then
        PR_NUMBER=$(echo "$PR_DATA" | grep -o '"number":[0-9]*' | head -1 | cut -d':' -f2)
        log_test "PASS" "Create pull request" "Created PR #$PR_NUMBER"
        
        # Test 8.2: Get PR details
        PR_DETAIL_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/pulls/$PR_NUMBER")
        PR_DETAIL_HTTP_CODE=$(echo "$PR_DETAIL_RESPONSE" | tail -n 1)
        
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
                -d "{\"body\":\"Test comment from Agent 2\"}")
            
            COMMENT_HTTP_CODE=$(echo "$COMMENT_RESPONSE" | tail -n 1)
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
            -d "{\"status\":\"approved\",\"body\":\"Looks good!\"}")
        
        REVIEW_HTTP_CODE=$(echo "$REVIEW_RESPONSE" | tail -n 1)
        if [ "$REVIEW_HTTP_CODE" == "200" ] || [ "$REVIEW_HTTP_CODE" == "201" ]; then
            log_test "PASS" "Add PR review" "Successfully added review to PR #$PR_NUMBER"
        else
            log_test "WARN" "Add PR review" "Review endpoint may not be implemented, got $REVIEW_HTTP_CODE"
        fi
        
        # Test 8.5: Merge pull request
        MERGE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/pulls/$PR_NUMBER/merge" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $AGENT1_API_KEY")
        
        MERGE_HTTP_CODE=$(echo "$MERGE_RESPONSE" | tail -n 1)
        MERGE_BODY=$(echo "$MERGE_RESPONSE" | sed '$d')
        if [ "$MERGE_HTTP_CODE" == "200" ]; then
            log_test "PASS" "Merge pull request" "Successfully merged PR #$PR_NUMBER"
        else
            log_test "FAIL" "Merge pull request" "Expected 200, got $MERGE_HTTP_CODE. Response: $(echo "$MERGE_BODY" | head -c 300)"
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
STAR_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/star" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AGENT2_API_KEY")

STAR_HTTP_CODE=$(echo "$STAR_RESPONSE" | tail -n 1)
if [ "$STAR_HTTP_CODE" == "200" ]; then
    log_test "PASS" "Star repository" "Agent2 starred Agent1's repository"
    
    # Test 9.2: Unstar repository (toggle via DELETE)
    UNSTAR_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/star" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AGENT2_API_KEY")
    
    UNSTAR_HTTP_CODE=$(echo "$UNSTAR_RESPONSE" | tail -n 1)
    if [ "$UNSTAR_HTTP_CODE" == "200" ]; then
        log_test "PASS" "Unstar repository" "Successfully unstarred"
    else
        log_test "FAIL" "Unstar repository" "Expected 200, got $UNSTAR_HTTP_CODE"
    fi
else
    log_test "FAIL" "Star repository" "Expected 200, got $STAR_HTTP_CODE"
fi

# Test 9.3: Watch repository
WATCH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/watch" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AGENT2_API_KEY")

WATCH_HTTP_CODE=$(echo "$WATCH_RESPONSE" | tail -n 1)
if [ "$WATCH_HTTP_CODE" == "200" ]; then
    log_test "PASS" "Watch repository" "Agent2 watching Agent1's repository"
    
    # Test 9.4: Unwatch repository (toggle via DELETE)
    UNWATCH_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/watch" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AGENT2_API_KEY")
    
    UNWATCH_HTTP_CODE=$(echo "$UNWATCH_RESPONSE" | tail -n 1)
    if [ "$UNWATCH_HTTP_CODE" == "200" ]; then
        log_test "PASS" "Unwatch repository" "Successfully unwatched"
    else
        log_test "FAIL" "Unwatch repository" "Expected 200, got $UNWATCH_HTTP_CODE"
    fi
else
    log_test "FAIL" "Watch repository" "Expected 200, got $WATCH_HTTP_CODE"
fi

# Test 9.4: Fork repository
FORK_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/fork" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AGENT2_API_KEY")

FORK_HTTP_CODE=$(echo "$FORK_RESPONSE" | tail -n 1)
if [ "$FORK_HTTP_CODE" == "201" ]; then
    log_test "PASS" "Fork repository" "Agent2 successfully forked Agent1's repository"
else
    log_test "WARN" "Fork repository" "Fork feature may not be fully implemented, got $FORK_HTTP_CODE"
fi

# Test 10: Edge Cases and Security
echo "## 10. Edge Cases & Security Tests" >> "$TEST_RESULTS_FILE"
echo -e "\n${BLUE}[10] Edge Cases & Security Tests${NC}"

# Test 10.1: SQL Injection attempt (URL-encode path so server receives valid request)
SQL_INJECTION_USERNAME="admin%27%20OR%20%271%27%3D%271"
SQL_INJECTION_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/agents/$SQL_INJECTION_USERNAME")
SQL_INJECTION_HTTP_CODE=$(echo "$SQL_INJECTION_RESPONSE" | tail -n 1)

if [ "$SQL_INJECTION_HTTP_CODE" == "404" ] || [ "$SQL_INJECTION_HTTP_CODE" == "400" ]; then
    log_test "PASS" "SQL injection protection" "SQL injection attempt handled safely"
else
    log_test "WARN" "SQL injection protection" "Unexpected response: $SQL_INJECTION_HTTP_CODE"
fi

# Test 10.2: XSS attempt in agent name
XSS_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/agents/register \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"<script>alert('xss')</script>\",\"email\":\"xss@test.com\"}")

XSS_HTTP_CODE=$(echo "$XSS_RESPONSE" | tail -n 1)
if [ "$XSS_HTTP_CODE" == "400" ]; then
    log_test "PASS" "XSS protection in username" "Correctly rejected script tags"
else
    log_test "WARN" "XSS protection in username" "May need input sanitization, got $XSS_HTTP_CODE"
fi

# Test 10.3: Authentication required endpoints
UNAUTH_RESPONSE=$(curl -s -w "\n%{http_code}" $BASE_URL/api/agents/me)
UNAUTH_HTTP_CODE=$(echo "$UNAUTH_RESPONSE" | tail -n 1)

if [ "$UNAUTH_HTTP_CODE" == "401" ]; then
    log_test "PASS" "Authentication enforcement" "Protected endpoint correctly returns 401"
else
    log_test "FAIL" "Authentication enforcement" "Expected 401, got $UNAUTH_HTTP_CODE"
fi

# Test 10.4: Invalid API key
INVALID_KEY_RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer invalid-key-12345" $BASE_URL/api/agents/me)
INVALID_KEY_HTTP_CODE=$(echo "$INVALID_KEY_RESPONSE" | tail -n 1)

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
    RATE_HTTP_CODE=$(echo "$RATE_RESPONSE" | tail -n 1)
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

LARGE_PAYLOAD_HTTP_CODE=$(echo "$LARGE_PAYLOAD_RESPONSE" | tail -n 1)
if [ "$LARGE_PAYLOAD_HTTP_CODE" == "400" ] || [ "$LARGE_PAYLOAD_HTTP_CODE" == "413" ]; then
    log_test "PASS" "Large payload rejection" "Correctly rejected oversized payload"
else
    log_test "WARN" "Large payload handling" "May need payload size limits, got $LARGE_PAYLOAD_HTTP_CODE"
fi

# Test 11: Issues Management
echo "## 11. Issues Management Tests" >> "$TEST_RESULTS_FILE"
echo -e "\n${BLUE}[11] Issues Management Tests${NC}"

# Test 11.1: Create Issue #1
ISSUE1_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/issues \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AGENT1_API_KEY" \
    -d '{"title":"Test Issue #1","body":"This is a test issue"}')

ISSUE1_HTTP_CODE=$(echo "$ISSUE1_RESPONSE" | tail -n 1)
ISSUE1_BODY=$(echo "$ISSUE1_RESPONSE" | sed $d)
ISSUE1_NUMBER=$(echo "$ISSUE1_BODY" | jq -r '.number // .issue.number // empty')

if [[ "$ISSUE1_HTTP_CODE" == "200" || "$ISSUE1_HTTP_CODE" == "201" ]] && [ "$ISSUE1_NUMBER" == "1" ]; then
    log_test "PASS" "Create issue #1" "Issue created with number 1"
else
    log_test "FAIL" "Create issue #1" "Expected HTTP 200/201 and issue number 1, got $ISSUE1_HTTP_CODE"
fi

# Test 11.2: List issues
ISSUES_LIST=$(curl -s -X GET "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/issues?status=open" \
    -H "Authorization: Bearer $AGENT1_API_KEY")
ISSUE_COUNT=$(echo "$ISSUES_LIST" | jq -r '.issues | length')

if [ "$ISSUE_COUNT" -ge "1" ]; then
    log_test "PASS" "List open issues" "Found $ISSUE_COUNT issue(s)"
else
    log_test "FAIL" "List open issues" "Expected at least 1 issue, got $ISSUE_COUNT"
fi

# Test 11.3: Get specific issue
ISSUE_DETAIL=$(curl -s -X GET "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/issues/1" \
    -H "Authorization: Bearer $AGENT1_API_KEY")
ISSUE_TITLE=$(echo "$ISSUE_DETAIL" | jq -r '.title')

if [ "$ISSUE_TITLE" == "Test Issue #1" ]; then
    log_test "PASS" "Get issue by number" "Retrieved correct issue"
else
    log_test "FAIL" "Get issue by number" "Expected 'Test Issue #1', got '$ISSUE_TITLE'"
fi

# Test 11.4: Add comment to issue
COMMENT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/issues/1/comments" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AGENT1_API_KEY" \
    -d '{"body":"This is a test comment"}')

COMMENT_HTTP_CODE=$(echo "$COMMENT_RESPONSE" | tail -n 1)

if [[ "$COMMENT_HTTP_CODE" == "200" || "$COMMENT_HTTP_CODE" == "201" ]]; then
    log_test "PASS" "Add issue comment" "Comment added successfully"
else
    log_test "FAIL" "Add issue comment" "Expected HTTP 200/201, got $COMMENT_HTTP_CODE"
fi

# Test 11.5: Close issue
CLOSE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/issues/1/close" \
    -H "Authorization: Bearer $AGENT1_API_KEY")

CLOSE_HTTP_CODE=$(echo "$CLOSE_RESPONSE" | tail -n 1)

if [ "$CLOSE_HTTP_CODE" == "200" ]; then
    log_test "PASS" "Close issue" "Issue closed successfully"
else
    log_test "FAIL" "Close issue" "Expected HTTP 200, got $CLOSE_HTTP_CODE"
fi

# Test 11.6: Reopen issue
REOPEN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/issues/1/reopen" \
    -H "Authorization: Bearer $AGENT1_API_KEY")

REOPEN_HTTP_CODE=$(echo "$REOPEN_RESPONSE" | tail -n 1)

if [ "$REOPEN_HTTP_CODE" == "200" ]; then
    log_test "PASS" "Reopen issue" "Issue reopened successfully"
else
    log_test "FAIL" "Reopen issue" "Expected HTTP 200, got $REOPEN_HTTP_CODE"
fi

# Test 12: Releases Management
echo "## 12. Releases Management Tests" >> "$TEST_RESULTS_FILE"
echo -e "\n${BLUE}[12] Releases Management Tests${NC}"

# Test 12.1: Create draft release
RELEASE1_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/releases" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AGENT1_API_KEY" \
    -d '{"tagName":"v1.0.0","name":"Version 1.0.0","body":"Initial release","isDraft":true,"isPrerelease":false}')

RELEASE1_HTTP_CODE=$(echo "$RELEASE1_RESPONSE" | tail -n 1)
RELEASE1_BODY=$(echo "$RELEASE1_RESPONSE" | sed '$d')
RELEASE1_TAG=$(echo "$RELEASE1_BODY" | jq -r '.tagName // .release.tagName // empty')

if [[ "$RELEASE1_HTTP_CODE" == "200" || "$RELEASE1_HTTP_CODE" == "201" ]] && [ "$RELEASE1_TAG" == "v1.0.0" ]; then
    log_test "PASS" "Create draft release" "Draft release v1.0.0 created"
    RELEASE1_ID=$(echo "$RELEASE1_BODY" | jq -r '.id // .release.id // empty')
else
    log_test "FAIL" "Create draft release" "Expected HTTP 200/201 and tag v1.0.0, got $RELEASE1_HTTP_CODE"
fi

# Test 12.2: List releases
RELEASES_LIST=$(curl -s -X GET "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/releases" \
    -H "Authorization: Bearer $AGENT1_API_KEY")
RELEASE_COUNT=$(echo "$RELEASES_LIST" | jq -r '.releases | length')

if [ "$RELEASE_COUNT" -ge "1" ]; then
    log_test "PASS" "List releases" "Found $RELEASE_COUNT release(s)"
else
    log_test "FAIL" "List releases" "Expected at least 1 release, got $RELEASE_COUNT"
fi

# Test 12.3: Get release by tag
RELEASE_DETAIL=$(curl -s -X GET "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/releases/tags/v1.0.0" \
    -H "Authorization: Bearer $AGENT1_API_KEY")
RELEASE_NAME=$(echo "$RELEASE_DETAIL" | jq -r '.name')

if [ "$RELEASE_NAME" == "Version 1.0.0" ]; then
    log_test "PASS" "Get release by tag" "Retrieved correct release"
else
    log_test "FAIL" "Get release by tag" "Expected 'Version 1.0.0', got '$RELEASE_NAME'"
fi

# Test 12.4: Publish draft release
if [ -n "$RELEASE1_ID" ] && [ "$RELEASE1_ID" != "null" ]; then
    PUBLISH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/releases/$RELEASE1_ID/publish" \
        -H "Authorization: Bearer $AGENT1_API_KEY")
    
    PUBLISH_HTTP_CODE=$(echo "$PUBLISH_RESPONSE" | tail -n 1)
    
    if [ "$PUBLISH_HTTP_CODE" == "200" ]; then
        log_test "PASS" "Publish draft release" "Release published successfully"
    else
        log_test "FAIL" "Publish draft release" "Expected HTTP 200, got $PUBLISH_HTTP_CODE"
    fi
fi

# Test 12.5: Get latest release
LATEST_RELEASE=$(curl -s -X GET "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/releases/latest")
LATEST_TAG=$(echo "$LATEST_RELEASE" | jq -r '.tagName')

if [ "$LATEST_TAG" == "v1.0.0" ]; then
    log_test "PASS" "Get latest release" "Latest release is v1.0.0"
else
    log_test "WARN" "Get latest release" "Expected v1.0.0, got '$LATEST_TAG'"
fi

# Test 12.6: Create prerelease
PRERELEASE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/releases" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AGENT1_API_KEY" \
    -d '{"tagName":"v2.0.0-beta","name":"Version 2.0.0 Beta","body":"Beta release","isDraft":false,"isPrerelease":true}')

PRERELEASE_HTTP_CODE=$(echo "$PRERELEASE_RESPONSE" | tail -n 1)

if [[ "$PRERELEASE_HTTP_CODE" == "200" || "$PRERELEASE_HTTP_CODE" == "201" ]]; then
    log_test "PASS" "Create prerelease" "Prerelease created successfully"
else
    log_test "FAIL" "Create prerelease" "Expected HTTP 200/201, got $PRERELEASE_HTTP_CODE"
fi

# Test 13: Repository Update Authorization
echo "## 13. Repository Update Authorization Tests" >> "$TEST_RESULTS_FILE"
echo -e "\n${BLUE}[13] Repository Update Authorization Tests${NC}"

# Test 13.1: UPDATE without authentication
UPDATE_NO_AUTH=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH \
    -H "Content-Type: application/json" \
    -d '{"description":"Unauthorized update"}' \
    "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME")

if [ "$UPDATE_NO_AUTH" == "401" ]; then
    log_test "PASS" "UPDATE without auth returns 401" "Correctly blocked"
else
    log_test "FAIL" "UPDATE without auth" "Expected 401, got $UPDATE_NO_AUTH"
fi

# Test 13.2: UPDATE with invalid API key
UPDATE_INVALID_KEY=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer invalid-key-123" \
    -d '{"description":"Invalid update"}' \
    "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME")

if [ "$UPDATE_INVALID_KEY" == "401" ]; then
    log_test "PASS" "UPDATE with invalid key returns 401" "Correctly blocked"
else
    log_test "FAIL" "UPDATE with invalid key" "Expected 401, got $UPDATE_INVALID_KEY"
fi

# Test 13.3: UPDATE by non-owner
UPDATE_NON_OWNER=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AGENT2_API_KEY" \
    -d '{"description":"Forbidden update"}' \
    "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME")

if [ "$UPDATE_NON_OWNER" == "403" ]; then
    log_test "PASS" "UPDATE by non-owner returns 403" "Correctly blocked"
else
    log_test "FAIL" "UPDATE by non-owner" "Expected 403, got $UPDATE_NON_OWNER"
fi

# Test 13.4: Valid UPDATE by owner
UPDATE_VALID=$(curl -s -w "\n%{http_code}" -X PATCH \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AGENT1_API_KEY" \
    -d '{"description":"Updated by owner"}' \
    "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME")

UPDATE_VALID_CODE=$(echo "$UPDATE_VALID" | tail -n 1)

if [ "$UPDATE_VALID_CODE" == "200" ]; then
    log_test "PASS" "Valid UPDATE by owner" "Update successful"
else
    log_test "FAIL" "Valid UPDATE by owner" "Expected 200, got $UPDATE_VALID_CODE"
fi

# Test 14: Repository Delete Authorization
echo "## 14. Repository Delete Authorization Tests" >> "$TEST_RESULTS_FILE"
echo -e "\n${BLUE}[14] Repository Delete Authorization Tests${NC}"

# Create a test repository for deletion tests
DELETE_TEST_REPO="delete-test-$(date +%s)"
curl -s -X POST $BASE_URL/api/repositories \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AGENT1_API_KEY" \
    -d "{\"name\":\"$DELETE_TEST_REPO\",\"description\":\"For delete testing\"}" > /dev/null

# Test 14.1: DELETE without authentication
DELETE_NO_AUTH=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
    "$BASE_URL/api/repositories/$AGENT1_USERNAME/$DELETE_TEST_REPO")

if [ "$DELETE_NO_AUTH" == "401" ]; then
    log_test "PASS" "DELETE without auth returns 401" "Correctly blocked"
else
    log_test "FAIL" "DELETE without auth" "Expected 401, got $DELETE_NO_AUTH"
fi

# Test 14.2: DELETE with invalid API key
DELETE_INVALID_KEY=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
    -H "Authorization: Bearer invalid-key-123" \
    "$BASE_URL/api/repositories/$AGENT1_USERNAME/$DELETE_TEST_REPO")

if [ "$DELETE_INVALID_KEY" == "401" ]; then
    log_test "PASS" "DELETE with invalid key returns 401" "Correctly blocked"
else
    log_test "FAIL" "DELETE with invalid key" "Expected 401, got $DELETE_INVALID_KEY"
fi

# Test 14.3: DELETE by non-owner
DELETE_NON_OWNER=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
    -H "Authorization: Bearer $AGENT2_API_KEY" \
    "$BASE_URL/api/repositories/$AGENT1_USERNAME/$DELETE_TEST_REPO")

if [ "$DELETE_NON_OWNER" == "403" ]; then
    log_test "PASS" "DELETE by non-owner returns 403" "Correctly blocked"
else
    log_test "FAIL" "DELETE by non-owner" "Expected 403, got $DELETE_NON_OWNER"
fi

# Test 14.4: DELETE non-existent repository
DELETE_NOTFOUND=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
    -H "Authorization: Bearer $AGENT1_API_KEY" \
    "$BASE_URL/api/repositories/$AGENT1_USERNAME/nonexistent-repo-999")

if [ "$DELETE_NOTFOUND" == "404" ]; then
    log_test "PASS" "DELETE non-existent repo returns 404" "Correctly handled"
else
    log_test "FAIL" "DELETE non-existent repo" "Expected 404, got $DELETE_NOTFOUND"
fi

# Test 14.5: Valid DELETE by owner
DELETE_VALID=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
    -H "Authorization: Bearer $AGENT1_API_KEY" \
    "$BASE_URL/api/repositories/$AGENT1_USERNAME/$DELETE_TEST_REPO")

if [ "$DELETE_VALID" == "200" ]; then
    log_test "PASS" "Valid DELETE by owner" "Repository deleted successfully"
else
    log_test "FAIL" "Valid DELETE by owner" "Expected 200, got $DELETE_VALID"
fi

# Test 15: Moltbook Integration
echo "## 15. Moltbook Integration Tests" >> "$TEST_RESULTS_FILE"
echo -e "\n${BLUE}[15] Moltbook Integration Tests${NC}"

# Test 15.1: Registration response structure
MOLTBOOK_AGENT="moltbook-test-$(date +%s)"
MOLTBOOK_RESPONSE=$(curl -s -X POST $BASE_URL/api/agents/register \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$MOLTBOOK_AGENT\",\"description\":\"Moltbook integration test\"}")

# Check required Moltbook fields
MOLTBOOK_SUCCESS=$(echo "$MOLTBOOK_RESPONSE" | jq -r '.success')
MOLTBOOK_SETUP=$(echo "$MOLTBOOK_RESPONSE" | jq -r '.setup')
MOLTBOOK_SKILL_FILES=$(echo "$MOLTBOOK_RESPONSE" | jq -r '.skill_files')
MOLTBOOK_TWEET=$(echo "$MOLTBOOK_RESPONSE" | jq -r '.tweet_template')

if [ "$MOLTBOOK_SUCCESS" != "null" ] && [ "$MOLTBOOK_SETUP" != "null" ] && [ "$MOLTBOOK_SKILL_FILES" != "null" ] && [ "$MOLTBOOK_TWEET" != "null" ]; then
    log_test "PASS" "Moltbook response structure" "All required fields present"
else
    log_test "FAIL" "Moltbook response structure" "Missing required fields"
fi

# Test 15.2: skill.md endpoint
SKILL_MD=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/skill.md")

if [ "$SKILL_MD" == "200" ]; then
    log_test "PASS" "skill.md endpoint" "Accessible"
else
    log_test "FAIL" "skill.md endpoint" "Expected 200, got $SKILL_MD"
fi

# Test 15.3: heartbeat.md endpoint
HEARTBEAT_MD=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/heartbeat.md")

if [ "$HEARTBEAT_MD" == "200" ]; then
    log_test "PASS" "heartbeat.md endpoint" "Accessible"
else
    log_test "FAIL" "heartbeat.md endpoint" "Expected 200, got $HEARTBEAT_MD"
fi

# Test 16: Pull Request & Issue Authorization
echo "## 16. Pull Request & Issue Authorization Tests" >> "$TEST_RESULTS_FILE"
echo -e "\n${BLUE}[16] Pull Request & Issue Authorization Tests${NC}"

# Setup: Create a fresh PR for merge authorization tests
cd "$TEST_DIR/$REPO_NAME" 2>/dev/null || true
if [ -d "$TEST_DIR/$REPO_NAME" ]; then
    git checkout -b feature-merge-auth 2>/dev/null
    echo "# Merge Auth Test" > merge-auth.txt
    git add merge-auth.txt
    git commit -m "Add merge auth test file" 2>/dev/null
    git push origin feature-merge-auth 2>/dev/null
fi

PR_MERGE_AUTH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/pulls" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AGENT2_API_KEY" \
    -d "{\"title\":\"Test PR for Merge Auth\",\"description\":\"Test merge authorization\",\"sourceBranch\":\"feature-merge-auth\",\"targetBranch\":\"$TARGET_BRANCH\"}")

PR_MERGE_AUTH_HTTP_CODE=$(echo "$PR_MERGE_AUTH_RESPONSE" | tail -n 1)
PR_MERGE_AUTH_DATA=$(echo "$PR_MERGE_AUTH_RESPONSE" | sed '$d')
PR_MERGE_AUTH_NUMBER=$(echo "$PR_MERGE_AUTH_DATA" | grep -o '"number":[0-9]*' | head -1 | cut -d':' -f2)

if [ -n "$PR_MERGE_AUTH_NUMBER" ]; then
    # Test 16.1: PR Merge - by non-owner (should fail 403)
    MERGE_NON_OWNER=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/pulls/$PR_MERGE_AUTH_NUMBER/merge" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AGENT2_API_KEY")

    MERGE_NON_OWNER_CODE=$(echo "$MERGE_NON_OWNER" | tail -n 1)

    if [ "$MERGE_NON_OWNER_CODE" == "403" ]; then
        log_test "PASS" "PR merge by non-owner returns 403" "Correctly blocked non-owner from merging"
    else
        log_test "FAIL" "PR merge by non-owner" "Expected 403, got $MERGE_NON_OWNER_CODE"
    fi

    # Test 16.2: PR Merge - by owner (should succeed)
    MERGE_BY_OWNER=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/pulls/$PR_MERGE_AUTH_NUMBER/merge" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AGENT1_API_KEY")

    MERGE_BY_OWNER_CODE=$(echo "$MERGE_BY_OWNER" | tail -n 1)

    if [ "$MERGE_BY_OWNER_CODE" == "200" ]; then
        log_test "PASS" "PR merge by owner succeeds" "Repository owner can merge PRs"
    else
        MERGE_BY_OWNER_BODY=$(echo "$MERGE_BY_OWNER" | sed '$d')
        log_test "FAIL" "PR merge by owner" "Expected 200, got $MERGE_BY_OWNER_CODE. Response: $(echo "$MERGE_BY_OWNER_BODY" | head -c 200)"
    fi
fi

# Create a new PR for close tests
sleep 1
cd "$TEST_DIR/$REPO_NAME" 2>/dev/null || true
if [ -d "$TEST_DIR/$REPO_NAME" ]; then
    git checkout -b feature-close-test 2>/dev/null
    echo "# Close Test" > close-test.txt
    git add close-test.txt
    git commit -m "Add close test file" 2>/dev/null
    git push origin feature-close-test 2>/dev/null
fi

PR2_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/pulls" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AGENT1_API_KEY" \
    -d "{\"title\":\"Test PR for Close\",\"description\":\"Test pull request for close auth\",\"sourceBranch\":\"feature-close-test\",\"targetBranch\":\"$TARGET_BRANCH\"}")

PR2_HTTP_CODE=$(echo "$PR2_RESPONSE" | tail -n 1)
PR2_DATA=$(echo "$PR2_RESPONSE" | sed '$d')
PR2_NUMBER=$(echo "$PR2_DATA" | grep -o '"number":[0-9]*' | head -1 | cut -d':' -f2)

if [ -n "$PR2_NUMBER" ]; then
    # Test 16.3: PR Close - by third party (should fail 403)
    CLOSE_THIRD_PARTY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/pulls/$PR2_NUMBER/close" \
        -H "Authorization: Bearer $AGENT2_API_KEY")

    CLOSE_THIRD_PARTY_CODE=$(echo "$CLOSE_THIRD_PARTY" | tail -n 1)

    if [ "$CLOSE_THIRD_PARTY_CODE" == "403" ]; then
        log_test "PASS" "PR close by third party returns 403" "Correctly blocked unauthorized close"
    else
        log_test "FAIL" "PR close by third party" "Expected 403, got $CLOSE_THIRD_PARTY_CODE"
    fi

    # Test 16.4: PR Close - by PR author (should succeed)
    CLOSE_BY_AUTHOR=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/pulls/$PR2_NUMBER/close" \
        -H "Authorization: Bearer $AGENT1_API_KEY")

    CLOSE_BY_AUTHOR_CODE=$(echo "$CLOSE_BY_AUTHOR" | tail -n 1)

    if [ "$CLOSE_BY_AUTHOR_CODE" == "200" ]; then
        log_test "PASS" "PR close by author succeeds" "PR author can close their own PR"
    else
        log_test "FAIL" "PR close by author" "Expected 200, got $CLOSE_BY_AUTHOR_CODE"
    fi
fi

# Create a new PR from Agent2 for owner close test
cd "$TEST_DIR/$REPO_NAME" 2>/dev/null || true
if [ -d "$TEST_DIR/$REPO_NAME" ]; then
    git checkout -b feature-owner-close 2>/dev/null
    echo "# Owner Close Test" > owner-close.txt
    git add owner-close.txt
    git commit -m "Add owner close test" 2>/dev/null
    git push origin feature-owner-close 2>/dev/null
fi

PR3_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/pulls" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AGENT2_API_KEY" \
    -d "{\"title\":\"Test PR from Agent2\",\"description\":\"Test for owner close\",\"sourceBranch\":\"feature-owner-close\",\"targetBranch\":\"$TARGET_BRANCH\"}")

PR3_HTTP_CODE=$(echo "$PR3_RESPONSE" | tail -n 1)
PR3_DATA=$(echo "$PR3_RESPONSE" | sed '$d')
PR3_NUMBER=$(echo "$PR3_DATA" | grep -o '"number":[0-9]*' | head -1 | cut -d':' -f2)

if [ -n "$PR3_NUMBER" ]; then
    # Test 16.5: PR Close - by repo owner (should succeed)
    CLOSE_BY_OWNER=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/pulls/$PR3_NUMBER/close" \
        -H "Authorization: Bearer $AGENT1_API_KEY")

    CLOSE_BY_OWNER_CODE=$(echo "$CLOSE_BY_OWNER" | tail -n 1)

    if [ "$CLOSE_BY_OWNER_CODE" == "200" ]; then
        log_test "PASS" "PR close by repo owner succeeds" "Repository owner can close any PR"
    else
        log_test "FAIL" "PR close by repo owner" "Expected 200, got $CLOSE_BY_OWNER_CODE"
    fi
fi

# Create an issue from Agent2 for authorization tests
ISSUE_AUTH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/issues \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AGENT2_API_KEY" \
    -d '{"title":"Test Issue from Agent2","body":"For authorization testing"}')

ISSUE_AUTH_HTTP_CODE=$(echo "$ISSUE_AUTH_RESPONSE" | tail -n 1)
ISSUE_AUTH_DATA=$(echo "$ISSUE_AUTH_RESPONSE" | sed '$d')
ISSUE_AUTH_NUMBER=$(echo "$ISSUE_AUTH_DATA" | jq -r '.number // .issue.number // empty')

if [ -n "$ISSUE_AUTH_NUMBER" ]; then
    # Test 16.6: Issue Close - by third party (should fail 403)
    ISSUE_CLOSE_THIRD_PARTY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/issues/$ISSUE_AUTH_NUMBER/close" \
        -H "Authorization: Bearer $AGENT1_API_KEY")

    # First close it as owner to test reopen
    if [ "$(echo "$ISSUE_CLOSE_THIRD_PARTY" | tail -n 1)" == "200" ]; then
        log_test "PASS" "Issue close by repo owner succeeds" "Repository owner can close issues"

        # Test 16.7: Issue Reopen - by third party (should fail 403)
        # First we need to have a third agent, but we can use unauthorized
        ISSUE_REOPEN_THIRD_PARTY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/issues/$ISSUE_AUTH_NUMBER/reopen" \
            -H "Authorization: Bearer invalid-key")

        ISSUE_REOPEN_THIRD_PARTY_CODE=$(echo "$ISSUE_REOPEN_THIRD_PARTY" | tail -n 1)

        if [ "$ISSUE_REOPEN_THIRD_PARTY_CODE" == "401" ] || [ "$ISSUE_REOPEN_THIRD_PARTY_CODE" == "403" ]; then
            log_test "PASS" "Issue reopen without auth blocked" "Correctly blocked unauthorized reopen"
        else
            log_test "WARN" "Issue reopen authorization" "Expected 401/403, got $ISSUE_REOPEN_THIRD_PARTY_CODE"
        fi

        # Test 16.8: Issue Reopen - by issue author (should succeed)
        ISSUE_REOPEN_BY_AUTHOR=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/issues/$ISSUE_AUTH_NUMBER/reopen" \
            -H "Authorization: Bearer $AGENT2_API_KEY")

        ISSUE_REOPEN_BY_AUTHOR_CODE=$(echo "$ISSUE_REOPEN_BY_AUTHOR" | tail -n 1)

        if [ "$ISSUE_REOPEN_BY_AUTHOR_CODE" == "200" ]; then
            log_test "PASS" "Issue reopen by author succeeds" "Issue author can reopen their issue"
        else
            log_test "FAIL" "Issue reopen by author" "Expected 200, got $ISSUE_REOPEN_BY_AUTHOR_CODE"
        fi
    fi
fi

# Create another issue from Agent1 for owner/author tests
ISSUE2_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/issues \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AGENT2_API_KEY" \
    -d '{"title":"Test Issue 2 from Agent2","body":"For close/reopen testing"}')

ISSUE2_HTTP_CODE=$(echo "$ISSUE2_RESPONSE" | tail -n 1)
ISSUE2_DATA=$(echo "$ISSUE2_RESPONSE" | sed '$d')
ISSUE2_NUMBER=$(echo "$ISSUE2_DATA" | jq -r '.number // .issue.number // empty')

if [ -n "$ISSUE2_NUMBER" ]; then
    # Test 16.9: Issue Close - by issue author (should succeed)
    ISSUE_CLOSE_BY_AUTHOR=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/issues/$ISSUE2_NUMBER/close" \
        -H "Authorization: Bearer $AGENT2_API_KEY")

    ISSUE_CLOSE_BY_AUTHOR_CODE=$(echo "$ISSUE_CLOSE_BY_AUTHOR" | tail -n 1)

    if [ "$ISSUE_CLOSE_BY_AUTHOR_CODE" == "200" ]; then
        log_test "PASS" "Issue close by author succeeds" "Issue author can close their own issue"

        # Test 16.10: Issue Reopen - by repo owner (should succeed)
        ISSUE_REOPEN_BY_OWNER=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repositories/$AGENT1_USERNAME/$REPO_NAME/issues/$ISSUE2_NUMBER/reopen" \
            -H "Authorization: Bearer $AGENT1_API_KEY")

        ISSUE_REOPEN_BY_OWNER_CODE=$(echo "$ISSUE_REOPEN_BY_OWNER" | tail -n 1)

        if [ "$ISSUE_REOPEN_BY_OWNER_CODE" == "200" ]; then
            log_test "PASS" "Issue reopen by repo owner succeeds" "Repository owner can reopen any issue"
        else
            log_test "FAIL" "Issue reopen by repo owner" "Expected 200, got $ISSUE_REOPEN_BY_OWNER_CODE"
        fi
    else
        log_test "FAIL" "Issue close by author" "Expected 200, got $ISSUE_CLOSE_BY_AUTHOR_CODE"
    fi
fi

# =====================================================
# Test 18: Agent Claim via Twitter/X Verification
# =====================================================

echo -e "\n${BLUE}Test 18: Agent Claim via Twitter Verification${NC}"

# Test 18.1: Get claim info for valid token (200 OK)
echo -e "${YELLOW}Test 18.1: Get claim info for valid token${NC}"

if [ -n "$AGENT1_CLAIM_TOKEN" ]; then
    CLAIM_INFO=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/claim/$AGENT1_CLAIM_TOKEN/info")
    CLAIM_INFO_CODE=$(echo "$CLAIM_INFO" | tail -n 1)
    CLAIM_INFO_BODY=$(echo "$CLAIM_INFO" | sed '$d')

    if [ "$CLAIM_INFO_CODE" == "200" ]; then
        VERIFICATION_CODE=$(echo "$CLAIM_INFO_BODY" | jq -r '.verification_code')
        USERNAME=$(echo "$CLAIM_INFO_BODY" | jq -r '.username')

        if [ "$USERNAME" == "$AGENT1_USERNAME" ] && [ -n "$VERIFICATION_CODE" ]; then
            log_test "PASS" "Get claim info succeeds" "Returns username and verification code"
        else
            log_test "FAIL" "Get claim info format" "Missing username or verification_code in response"
        fi
    else
        log_test "FAIL" "Get claim info" "Expected 200, got $CLAIM_INFO_CODE"
    fi
else
    log_test "WARN" "Get claim info" "No claim token available to test"
fi

# Test 18.2: Get claim info for invalid token (404)
echo -e "${YELLOW}Test 18.2: Get claim info for invalid token${NC}"

INVALID_CLAIM=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/claim/invalid_token_12345/info")
INVALID_CLAIM_CODE=$(echo "$INVALID_CLAIM" | tail -n 1)

if [ "$INVALID_CLAIM_CODE" == "404" ]; then
    log_test "PASS" "Invalid claim token returns 404" "Properly rejects invalid tokens"
else
    log_test "FAIL" "Invalid claim token" "Expected 404, got $INVALID_CLAIM_CODE"
fi

# Test 18.3: Attempt claim with invalid URL format (400)
echo -e "${YELLOW}Test 18.3: Claim with invalid tweet URL format${NC}"

if [ -n "$AGENT1_CLAIM_TOKEN" ]; then
    CLAIM_INVALID_URL=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/claim/$AGENT1_CLAIM_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"tweet_url":"https://example.com/not-a-tweet"}')

    CLAIM_INVALID_URL_CODE=$(echo "$CLAIM_INVALID_URL" | tail -n 1)

    if [ "$CLAIM_INVALID_URL_CODE" == "400" ]; then
        log_test "PASS" "Invalid tweet URL rejected" "Returns 400 for invalid URL format"
    else
        log_test "FAIL" "Invalid tweet URL validation" "Expected 400, got $CLAIM_INVALID_URL_CODE"
    fi
else
    log_test "WARN" "Invalid tweet URL test" "No claim token available to test"
fi

# Test 18.4: Attempt claim with wrong verification code (400)
# Note: This test uses a real tweet URL format but the tweet won't contain our code
echo -e "${YELLOW}Test 18.4: Claim with wrong verification code${NC}"

if [ -n "$AGENT1_CLAIM_TOKEN" ]; then
    # Use a known public tweet that won't contain our verification code
    CLAIM_WRONG_CODE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/claim/$AGENT1_CLAIM_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"tweet_url":"https://twitter.com/twitter/status/1"}')

    CLAIM_WRONG_CODE_CODE=$(echo "$CLAIM_WRONG_CODE" | tail -n 1)

    # Could be 400 (verification failed) or 404 (tweet not found) - both acceptable
    if [ "$CLAIM_WRONG_CODE_CODE" == "400" ] || [ "$CLAIM_WRONG_CODE_CODE" == "404" ]; then
        log_test "PASS" "Verification code validation" "Rejects tweets without correct code"
    else
        log_test "WARN" "Verification code validation" "Got $CLAIM_WRONG_CODE_CODE (expected 400 or 404)"
    fi
else
    log_test "WARN" "Wrong verification code test" "No claim token available to test"
fi

# Test 18.5: Attempt to claim already claimed agent (404)
# Note: We can't easily test actual claiming without a real tweet, but we can test the flow
echo -e "${YELLOW}Test 18.5: Already claimed agent check${NC}"
log_test "SKIP" "Already claimed check" "Requires manual testing with real tweet (see manual test instructions)"

# Test 18.6: Verify agent status endpoint shows claim status
echo -e "${YELLOW}Test 18.6: Agent status reflects claim state${NC}"

if [ -n "$AGENT1_API_KEY" ]; then
    STATUS_CHECK=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/agents/status" \
        -H "Authorization: Bearer $AGENT1_API_KEY")

    STATUS_CHECK_CODE=$(echo "$STATUS_CHECK" | tail -n 1)
    STATUS_CHECK_BODY=$(echo "$STATUS_CHECK" | sed '$d')

    if [ "$STATUS_CHECK_CODE" == "200" ]; then
        STATUS_VALUE=$(echo "$STATUS_CHECK_BODY" | jq -r '.status')

        if [ "$STATUS_VALUE" == "pending_claim" ]; then
            log_test "PASS" "Agent status shows pending_claim" "Unclaimed agents properly identified"
        elif [ "$STATUS_VALUE" == "claimed" ]; then
            log_test "WARN" "Agent status shows claimed" "Agent was previously claimed in another test run"
        else
            log_test "FAIL" "Agent status format" "Unknown status: $STATUS_VALUE"
        fi
    else
        log_test "FAIL" "Agent status endpoint" "Expected 200, got $STATUS_CHECK_CODE"
    fi
else
    log_test "WARN" "Agent status test" "No API key available to test"
fi

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Note: Full Twitter claim testing requires manual verification with actual tweets${NC}"
echo -e "${BLUE}See claim workflow documentation for end-to-end manual testing${NC}"
echo -e "${BLUE}================================================${NC}"

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
