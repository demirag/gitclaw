#!/bin/bash

# GitClaw Backend API Test Script
# Tests all repository and pull request endpoints

set -e

BASE_URL="http://localhost:5113"
API_KEY=$(cat /tmp/api_key.txt)

echo "🦞 GitClaw Backend API Test Suite"
echo "=================================="
echo ""

# Helper function to make API calls
api_get() {
    curl -s -X GET "$BASE_URL$1" -H "X-API-Key: $API_KEY"
}

api_post() {
    curl -s -X POST "$BASE_URL$1" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: $API_KEY" \
        -d "$2"
}

api_patch() {
    curl -s -X PATCH "$BASE_URL$1" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: $API_KEY" \
        -d "$2"
}

# Test counters
PASS=0
FAIL=0

test_endpoint() {
    local name="$1"
    local result="$2"
    
    if echo "$result" | jq . >/dev/null 2>&1; then
        if echo "$result" | jq -e '.error' >/dev/null 2>&1; then
            echo "❌ FAIL: $name"
            echo "   Error: $(echo "$result" | jq -r '.error')"
            FAIL=$((FAIL + 1))
        else
            echo "✅ PASS: $name"
            PASS=$((PASS + 1))
        fi
    else
        echo "❌ FAIL: $name (Invalid JSON)"
        FAIL=$((FAIL + 1))
    fi
}

# ======================
# REPOSITORY ENDPOINTS
# ======================
echo "📁 Testing Repository Endpoints"
echo "--------------------------------"

# 1. List repositories
result=$(api_get "/api/repositories")
test_endpoint "GET /api/repositories (list)" "$result"

# 2. Get specific repository
result=$(api_get "/api/repositories/testuser/test-repo")
test_endpoint "GET /api/repositories/{owner}/{name}" "$result"

# 3. Get repository stats
result=$(api_get "/api/repositories/testuser/test-repo/stats")
test_endpoint "GET /api/repositories/{owner}/{name}/stats" "$result"

# 4. Get commits
result=$(api_get "/api/repositories/testuser/test-repo/commits")
test_endpoint "GET /api/repositories/{owner}/{name}/commits" "$result"

# 5. Get branches
result=$(api_get "/api/repositories/testuser/test-repo/branches")
test_endpoint "GET /api/repositories/{owner}/{name}/branches" "$result"

# 6. Create another repository for PR testing
result=$(api_post "/api/repositories" '{"owner":"testuser","name":"pr-test-repo","description":"For PR testing"}')
test_endpoint "POST /api/repositories (create)" "$result"

# 7. Update repository
result=$(api_patch "/api/repositories/testuser/test-repo" '{"description":"Updated description"}')
test_endpoint "PATCH /api/repositories/{owner}/{name}" "$result"

echo ""

# ======================
# PULL REQUEST ENDPOINTS
# ======================
echo "🔀 Testing Pull Request Endpoints"
echo "----------------------------------"

# 8. List pull requests
result=$(api_get "/api/repositories/testuser/test-repo/pulls")
test_endpoint "GET /api/repositories/{owner}/{repo}/pulls (list)" "$result"

# 9. Create pull request
result=$(api_post "/api/repositories/testuser/test-repo/pulls" '{"title":"Test PR #1","description":"Testing PR creation","sourceBranch":"feature","targetBranch":"main"}')
test_endpoint "POST /api/repositories/{owner}/{repo}/pulls (create)" "$result"
PR_NUMBER=$(echo "$result" | jq -r '.number // 1')

# 10. Get specific pull request
result=$(api_get "/api/repositories/testuser/test-repo/pulls/$PR_NUMBER")
test_endpoint "GET /api/repositories/{owner}/{repo}/pulls/{number}" "$result"

echo ""

# ======================
# PR COMMENTS ENDPOINTS
# ======================
echo "💬 Testing PR Comments Endpoints"
echo "---------------------------------"

# 11. Get PR comments (empty initially)
result=$(api_get "/api/repositories/testuser/test-repo/pulls/$PR_NUMBER/comments")
test_endpoint "GET /api/repositories/{owner}/{repo}/pulls/{number}/comments" "$result"

# 12. Add comment
result=$(api_post "/api/repositories/testuser/test-repo/pulls/$PR_NUMBER/comments" '{"body":"This is a test comment"}')
test_endpoint "POST /api/repositories/{owner}/{repo}/pulls/{number}/comments" "$result"
COMMENT_ID=$(echo "$result" | jq -r '.id // ""')

# 13. Add inline comment
result=$(api_post "/api/repositories/testuser/test-repo/pulls/$PR_NUMBER/comments" '{"body":"Inline comment on file","filePath":"README.md","lineNumber":10}')
test_endpoint "POST /api/repositories/{owner}/{repo}/pulls/{number}/comments (inline)" "$result"

# 14. Add reply to comment
if [ -n "$COMMENT_ID" ]; then
    result=$(api_post "/api/repositories/testuser/test-repo/pulls/$PR_NUMBER/comments" "{\"body\":\"Reply to comment\",\"parentCommentId\":\"$COMMENT_ID\"}")
    test_endpoint "POST /api/repositories/{owner}/{repo}/pulls/{number}/comments (reply)" "$result"
fi

# 15. Get comments after additions
result=$(api_get "/api/repositories/testuser/test-repo/pulls/$PR_NUMBER/comments")
test_endpoint "GET /api/repositories/{owner}/{repo}/pulls/{number}/comments (with data)" "$result"
COMMENT_COUNT=$(echo "$result" | jq '.count // 0')
echo "   📊 Comments created: $COMMENT_COUNT"

# 16. Update comment
if [ -n "$COMMENT_ID" ]; then
    result=$(api_patch "/api/repositories/testuser/test-repo/pulls/$PR_NUMBER/comments/$COMMENT_ID" '{"body":"Updated comment text"}')
    test_endpoint "PATCH /api/repositories/{owner}/{repo}/pulls/{number}/comments/{id}" "$result"
fi

echo ""

# ======================
# PR REVIEWS ENDPOINTS
# ======================
echo "👀 Testing PR Reviews Endpoints"
echo "--------------------------------"

# 17. Get PR reviews (empty initially)
result=$(api_get "/api/repositories/testuser/test-repo/pulls/$PR_NUMBER/reviews")
test_endpoint "GET /api/repositories/{owner}/{repo}/pulls/{number}/reviews" "$result"

# 18. Submit approval review
result=$(api_post "/api/repositories/testuser/test-repo/pulls/$PR_NUMBER/reviews" '{"status":"approved","body":"Looks good to me!"}')
test_endpoint "POST /api/repositories/{owner}/{repo}/pulls/{number}/reviews (approve)" "$result"

# 19. Submit changes requested review
result=$(api_post "/api/repositories/testuser/test-repo/pulls/$PR_NUMBER/reviews" '{"status":"changes_requested","body":"Please fix formatting"}')
test_endpoint "POST /api/repositories/{owner}/{repo}/pulls/{number}/reviews (changes)" "$result"

# 20. Submit comment-only review
result=$(api_post "/api/repositories/testuser/test-repo/pulls/$PR_NUMBER/reviews" '{"status":"commented","body":"Just a comment"}')
test_endpoint "POST /api/repositories/{owner}/{repo}/pulls/{number}/reviews (comment)" "$result"

# 21. Get reviews after additions
result=$(api_get "/api/repositories/testuser/test-repo/pulls/$PR_NUMBER/reviews")
test_endpoint "GET /api/repositories/{owner}/{repo}/pulls/{number}/reviews (with data)" "$result"
REVIEW_COUNT=$(echo "$result" | jq '.count // 0')
echo "   📊 Reviews created: $REVIEW_COUNT"

echo ""

# ======================
# PR STATE MANAGEMENT
# ======================
echo "🔧 Testing PR State Management"
echo "-------------------------------"

# 22. Create another PR for merge testing
result=$(api_post "/api/repositories/testuser/test-repo/pulls" '{"title":"PR to merge","description":"Will be merged","sourceBranch":"dev","targetBranch":"main"}')
test_endpoint "POST /api/repositories/{owner}/{repo}/pulls (for merge)" "$result"
MERGE_PR_NUMBER=$(echo "$result" | jq -r '.number // 2')

# 23. Merge pull request
result=$(api_post "/api/repositories/testuser/test-repo/pulls/$MERGE_PR_NUMBER/merge" '{}')
test_endpoint "POST /api/repositories/{owner}/{repo}/pulls/{number}/merge" "$result"

# 24. Create PR for closing
result=$(api_post "/api/repositories/testuser/test-repo/pulls" '{"title":"PR to close","description":"Will be closed","sourceBranch":"fix","targetBranch":"main"}')
test_endpoint "POST /api/repositories/{owner}/{repo}/pulls (for close)" "$result"
CLOSE_PR_NUMBER=$(echo "$result" | jq -r '.number // 3')

# 25. Close pull request
result=$(api_post "/api/repositories/testuser/test-repo/pulls/$CLOSE_PR_NUMBER/close" '{}')
test_endpoint "POST /api/repositories/{owner}/{repo}/pulls/{number}/close" "$result"

echo ""

# ======================
# FILE BROWSING
# ======================
echo "📄 Testing File Browsing Endpoints"
echo "-----------------------------------"

# 26. Browse repository root (will be empty for new repo)
result=$(api_get "/api/repositories/testuser/test-repo/tree/")
test_endpoint "GET /api/repositories/{owner}/{name}/tree/ (browse root)" "$result"

# Note: The following tests will work once repository has actual commits
# Commenting them out for now since we have an empty repo
# result=$(api_get "/api/repositories/testuser/test-repo/tree/README.md")
# test_endpoint "GET /api/repositories/{owner}/{name}/tree/{path} (file)" "$result"

# result=$(api_get "/api/repositories/testuser/test-repo/raw/README.md")
# test_endpoint "GET /api/repositories/{owner}/{name}/raw/{path}" "$result"

echo ""

# ======================
# SUMMARY
# ======================
echo "=================================="
echo "📊 Test Results Summary"
echo "=================================="
echo "✅ Passed: $PASS"
echo "❌ Failed: $FAIL"
echo "📈 Total:  $((PASS + FAIL))"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "🎉 All tests passed!"
    exit 0
else
    echo "⚠️  Some tests failed. Check the output above."
    exit 1
fi
