#!/bin/bash

# Test DELETE Repository Edge Cases
BASE_URL="http://localhost:5113"

echo "==================================="
echo "Testing DELETE Edge Cases"
echo "==================================="

# Setup: Register agent and create repo
TEST_USERNAME="delete-edge-$(date +%s)"
echo "Setup: Creating test agent and repository..."
AGENT_RESPONSE=$(curl -s -X POST $BASE_URL/api/agents/register \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$TEST_USERNAME\",\"email\":\"test@test.com\",\"description\":\"Test\"}")

API_KEY=$(echo "$AGENT_RESPONSE" | jq -r '.agent.api_key // empty')
REPO_NAME="test-repo-$(date +%s)"

curl -s -X POST $BASE_URL/api/repositories \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d "{\"name\":\"$REPO_NAME\",\"description\":\"Test\"}" > /dev/null

echo "✓ Setup complete: $TEST_USERNAME/$REPO_NAME"
echo ""

# Test 1: DELETE without authentication
echo "Test 1: DELETE without Authorization header"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X DELETE \
    "$BASE_URL/api/repositories/$TEST_USERNAME/$REPO_NAME")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
echo "  Result: HTTP $HTTP_CODE (expected 401)"
echo ""

# Test 2: DELETE with wrong API key
echo "Test 2: DELETE with invalid API key"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X DELETE \
    -H "Authorization: Bearer invalid-key-123" \
    "$BASE_URL/api/repositories/$TEST_USERNAME/$REPO_NAME")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
echo "  Result: HTTP $HTTP_CODE (expected 401)"
echo ""

# Test 3: DELETE non-existent repository
echo "Test 3: DELETE non-existent repository"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X DELETE \
    -H "Authorization: Bearer $API_KEY" \
    "$BASE_URL/api/repositories/$TEST_USERNAME/nonexistent-repo-999")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
echo "  Result: HTTP $HTTP_CODE (expected 404)"
echo ""

# Test 4: DELETE with trailing slash
echo "Test 4: DELETE with trailing slash in URL"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X DELETE \
    -H "Authorization: Bearer $API_KEY" \
    "$BASE_URL/api/repositories/$TEST_USERNAME/$REPO_NAME/")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
echo "  Result: HTTP $HTTP_CODE"
echo ""

# Test 5: DELETE with colon separator (GitHub style: owner:name)
echo "Test 5: DELETE with colon separator"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X DELETE \
    -H "Authorization: Bearer $API_KEY" \
    "$BASE_URL/api/repositories/$TEST_USERNAME:$REPO_NAME")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
echo "  Result: HTTP $HTTP_CODE"
echo ""

# Test 6: Successful DELETE
echo "Test 6: Valid DELETE (should succeed)"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X DELETE \
    -H "Authorization: Bearer $API_KEY" \
    "$BASE_URL/api/repositories/$TEST_USERNAME/$REPO_NAME")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE:")
echo "  Result: HTTP $HTTP_CODE"
echo "  Body: $BODY"
echo ""

echo "==================================="
echo "Summary: All edge cases tested"
echo "==================================="
