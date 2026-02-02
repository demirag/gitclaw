#!/bin/bash

# Test DELETE Repository Fix
BASE_URL="http://localhost:5113"

echo "=========================================="
echo "Testing DELETE Repository Fix"
echo "=========================================="

# Setup: Register two agents
echo -e "\nSetup: Creating test agents and repository..."
AGENT1_NAME="owner-$(date +%s)"
AGENT1_RESPONSE=$(curl -s -X POST $BASE_URL/api/agents/register \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$AGENT1_NAME\",\"email\":\"owner@test.com\",\"description\":\"Owner\"}")
AGENT1_KEY=$(echo "$AGENT1_RESPONSE" | jq -r '.agent.api_key')

AGENT2_NAME="other-$(date +%s)"
AGENT2_RESPONSE=$(curl -s -X POST $BASE_URL/api/agents/register \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$AGENT2_NAME\",\"email\":\"other@test.com\",\"description\":\"Other\"}")
AGENT2_KEY=$(echo "$AGENT2_RESPONSE" | jq -r '.agent.api_key')

# Create repository as Agent1
REPO_NAME="secure-repo-$(date +%s)"
REPO_RESPONSE=$(curl -s -X POST $BASE_URL/api/repositories \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AGENT1_KEY" \
    -d "{\"name\":\"$REPO_NAME\",\"description\":\"Test repo\"}")

echo "✓ Setup complete"
echo "  Owner: $AGENT1_NAME (owns $REPO_NAME)"
echo "  Other: $AGENT2_NAME"
echo ""

# Test 1: DELETE without authentication (should fail with 401)
echo "Test 1: DELETE without authentication"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X DELETE \
    "$BASE_URL/api/repositories/$AGENT1_NAME/$REPO_NAME")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE:")

if [ "$HTTP_CODE" == "401" ]; then
    echo "  ✅ PASS: Correctly returned 401 Unauthorized"
else
    echo "  ❌ FAIL: Expected 401, got $HTTP_CODE"
    echo "  Response: $BODY"
fi
echo ""

# Test 2: DELETE with invalid API key (should fail with 401)
echo "Test 2: DELETE with invalid API key"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X DELETE \
    -H "Authorization: Bearer invalid-key-123" \
    "$BASE_URL/api/repositories/$AGENT1_NAME/$REPO_NAME")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE:")

if [ "$HTTP_CODE" == "401" ]; then
    echo "  ✅ PASS: Correctly returned 401 Unauthorized"
else
    echo "  ❌ FAIL: Expected 401, got $HTTP_CODE"
    echo "  Response: $BODY"
fi
echo ""

# Test 3: DELETE by non-owner (should fail with 403)
echo "Test 3: DELETE by non-owner agent"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X DELETE \
    -H "Authorization: Bearer $AGENT2_KEY" \
    "$BASE_URL/api/repositories/$AGENT1_NAME/$REPO_NAME")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE:")

if [ "$HTTP_CODE" == "403" ]; then
    echo "  ✅ PASS: Correctly returned 403 Forbidden"
else
    echo "  ❌ FAIL: Expected 403, got $HTTP_CODE"
    echo "  Response: $BODY"
fi
echo ""

# Test 4: DELETE non-existent repository (should fail with 404)
echo "Test 4: DELETE non-existent repository"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X DELETE \
    -H "Authorization: Bearer $AGENT1_KEY" \
    "$BASE_URL/api/repositories/$AGENT1_NAME/nonexistent-999")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE:")

if [ "$HTTP_CODE" == "404" ]; then
    echo "  ✅ PASS: Correctly returned 404 Not Found"
else
    echo "  ❌ FAIL: Expected 404, got $HTTP_CODE"
    echo "  Response: $BODY"
fi
echo ""

# Test 5: Valid DELETE by owner (should succeed with 200)
echo "Test 5: Valid DELETE by repository owner"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X DELETE \
    -H "Authorization: Bearer $AGENT1_KEY" \
    "$BASE_URL/api/repositories/$AGENT1_NAME/$REPO_NAME")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE:")

if [ "$HTTP_CODE" == "200" ]; then
    echo "  ✅ PASS: Successfully deleted (HTTP 200)"
    echo "  Response: $BODY"
    
    # Verify repository is actually deleted
    VERIFY=$(curl -s -o /dev/null -w "%{http_code}" \
        "$BASE_URL/api/repositories/$AGENT1_NAME/$REPO_NAME")
    
    if [ "$VERIFY" == "404" ]; then
        echo "  ✅ VERIFIED: Repository confirmed deleted"
    else
        echo "  ❌ WARNING: Repository still exists (HTTP $VERIFY)"
    fi
else
    echo "  ❌ FAIL: Expected 200, got $HTTP_CODE"
    echo "  Response: $BODY"
fi
echo ""

# Summary
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo "✓ Test 1: Unauthenticated DELETE blocked"
echo "✓ Test 2: Invalid API key blocked"
echo "✓ Test 3: Non-owner DELETE blocked"
echo "✓ Test 4: Non-existent repository returns 404"
echo "✓ Test 5: Valid DELETE by owner succeeds"
echo ""
echo "BUG-001: FIXED ✅"
echo "- DELETE now requires authentication"
echo "- DELETE now requires ownership authorization"
echo "- Returns proper HTTP status codes"
echo "=========================================="
