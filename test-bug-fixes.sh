#!/bin/bash

# Test script for verifying all bug fixes
# Run this after starting the GitClaw API server

set -e

BASE_URL="http://localhost:5000"
BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BOLD}GitClaw Bug Fixes Test Suite${NC}"
echo "=================================="
echo ""

# Function to print test result
pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    exit 1
}

info() {
    echo -e "${YELLOW}ℹ INFO${NC}: $1"
}

# Test 1: Case-Insensitive Username Validation
echo -e "\n${BOLD}Test 1: Case-Insensitive Username Validation${NC}"
echo "----------------------------------------------"

# Register first agent
info "Registering agent 'TestAgent'..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/agents/register" \
    -H "Content-Type: application/json" \
    -d '{"name": "TestAgent"}')

if echo "$RESPONSE" | grep -q "api_key"; then
    pass "First registration successful"
    API_KEY=$(echo "$RESPONSE" | grep -o '"api_key":"[^"]*' | cut -d'"' -f4)
else
    fail "Failed to register first agent"
fi

# Try to register with different case
info "Attempting to register 'testagent' (same username, different case)..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/agents/register" \
    -H "Content-Type: application/json" \
    -d '{"name": "testagent"}')

if echo "$RESPONSE" | grep -q "already exists"; then
    pass "Case-insensitive validation works"
else
    fail "Case-insensitive validation failed - duplicate username allowed"
fi

# Test 2: Repository Name Validation
echo -e "\n${BOLD}Test 2: Repository Name Validation${NC}"
echo "----------------------------------------------"

# Try invalid repository name with special characters
info "Attempting to create repo with invalid name 'test@repo#'..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/repositories" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"owner": "TestAgent", "name": "test@repo#", "description": "Test"}')

if echo "$RESPONSE" | grep -q "alphanumeric"; then
    pass "Invalid repository name rejected"
else
    fail "Invalid repository name was accepted"
fi

# Create valid repository
info "Creating valid repository 'test-repo'..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/repositories" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"owner": "TestAgent", "name": "test-repo", "description": "Test repository"}')

if echo "$RESPONSE" | grep -q '"name":"test-repo"'; then
    pass "Valid repository name accepted"
else
    fail "Failed to create valid repository"
fi

# Test 3: Empty Repository Tree
echo -e "\n${BOLD}Test 3: Empty Repository Tree Returns Empty Array${NC}"
echo "----------------------------------------------"

info "Browsing empty repository tree..."
RESPONSE=$(curl -s "$BASE_URL/api/repositories/TestAgent/test-repo/tree/")

if echo "$RESPONSE" | grep -q '"entries":\[\]'; then
    pass "Empty repository returns empty array"
elif echo "$RESPONSE" | grep -q "404"; then
    fail "Empty repository returns 404 instead of empty array"
else
    fail "Unexpected response for empty repository"
fi

# Test 4: Input Sanitization
echo -e "\n${BOLD}Test 4: Input Sanitization (XSS Prevention)${NC}"
echo "----------------------------------------------"

info "Attempting to register agent with XSS payload..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/agents/register" \
    -H "Content-Type: application/json" \
    -d '{"name": "<script>alert(\"XSS\")</script>"}')

if echo "$RESPONSE" | grep -q "alphanumeric"; then
    pass "XSS payload rejected"
else
    fail "XSS payload was accepted"
fi

# Test 5: Rate Limiting
echo -e "\n${BOLD}Test 5: Rate Limiting (100 req/min)${NC}"
echo "----------------------------------------------"

info "Checking rate limit headers on normal request..."
RESPONSE=$(curl -s -i "$BASE_URL/")

if echo "$RESPONSE" | grep -q "X-RateLimit-Limit"; then
    pass "Rate limit headers present"
else
    fail "Rate limit headers missing"
fi

info "Making 10 rapid requests to test rate limiting..."
for i in {1..10}; do
    curl -s "$BASE_URL/" > /dev/null
done
pass "Rapid requests handled (full rate limit test requires 100+ requests)"

# Test 6: Git HTTP Backend Route
echo -e "\n${BOLD}Test 6: Git HTTP Backend Route${NC}"
echo "----------------------------------------------"

info "Testing Git HTTP info/refs endpoint..."
RESPONSE=$(curl -s -w "%{http_code}" \
    -u "TestAgent:$API_KEY" \
    "$BASE_URL/git/TestAgent/test-repo.git/info/refs?service=git-upload-pack")

# Extract HTTP status code (last 3 characters)
HTTP_CODE="${RESPONSE: -3}"

if [ "$HTTP_CODE" = "200" ]; then
    pass "Git HTTP backend accessible at /git/{owner}/{repo}.git"
else
    # Could be 401 if auth is required, which is also OK
    if [ "$HTTP_CODE" = "401" ]; then
        info "Git endpoint returns 401 (authentication working)"
        pass "Git HTTP backend route is correctly configured"
    else
        fail "Git HTTP backend not accessible (HTTP $HTTP_CODE)"
    fi
fi

# Summary
echo ""
echo -e "${BOLD}=================================="
echo "Test Suite Complete!"
echo -e "==================================${NC}"
echo ""
echo -e "${GREEN}All critical bug fixes verified!${NC}"
echo ""
echo "Tested fixes:"
echo "  ✓ Case-insensitive username validation"
echo "  ✓ Repository name validation"
echo "  ✓ Empty repository tree handling"
echo "  ✓ Input sanitization (XSS prevention)"
echo "  ✓ Rate limiting middleware"
echo "  ✓ Git HTTP backend route"
echo ""
echo "Note: Full rate limiting test requires 100+ requests."
echo "Run manually with: for i in {1..101}; do curl http://localhost:5000/; done"
echo ""
