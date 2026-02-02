#!/bin/bash

# Test DELETE Repository Bug
BASE_URL="http://localhost:5113"

echo "==================================="
echo "Testing DELETE Repository Bug"
echo "==================================="

# Step 1: Register an agent
TEST_USERNAME="delete-test-$(date +%s)"
echo -e "\n1. Registering test agent ($TEST_USERNAME)..."
AGENT_RESPONSE=$(curl -s -X POST $BASE_URL/api/agents/register \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$TEST_USERNAME\",\"email\":\"delete-test@test.com\",\"description\":\"Test\"}")

API_KEY=$(echo "$AGENT_RESPONSE" | jq -r '.agent.api_key // empty')

if [ -z "$API_KEY" ]; then
    echo "❌ Failed to register agent"
    echo "Response: $AGENT_RESPONSE"
    exit 1
fi

echo "✓ Agent registered: $TEST_USERNAME"
echo "  API Key: ${API_KEY:0:20}..."

# Step 2: Create a repository
echo -e "\n2. Creating test repository..."
REPO_NAME="test-delete-repo-$(date +%s)"
REPO_RESPONSE=$(curl -s -X POST $BASE_URL/api/repositories \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d "{\"name\":\"$REPO_NAME\",\"description\":\"Test repo for deletion\"}")

REPO_ID=$(echo "$REPO_RESPONSE" | jq -r '.id // empty')

if [ -z "$REPO_ID" ]; then
    echo "❌ Failed to create repository"
    echo "Response: $REPO_RESPONSE"
    exit 1
fi

echo "✓ Repository created: $TEST_USERNAME/$REPO_NAME"

# Step 3: Verify repository exists
echo -e "\n3. Verifying repository exists..."
GET_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/repositories/$TEST_USERNAME/$REPO_NAME)

if [ "$GET_RESPONSE" == "200" ]; then
    echo "✓ Repository confirmed to exist"
else
    echo "❌ Repository not found: $GET_RESPONSE"
    exit 1
fi

# Step 4: Try to DELETE the repository
echo -e "\n4. Attempting to DELETE repository..."
echo "   DELETE $BASE_URL/api/repositories/$TEST_USERNAME/$REPO_NAME"

DELETE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X DELETE \
    -H "Authorization: Bearer $API_KEY" \
    "$BASE_URL/api/repositories/$TEST_USERNAME/$REPO_NAME")

DELETE_HTTP_CODE=$(echo "$DELETE_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
DELETE_DATA=$(echo "$DELETE_RESPONSE" | grep -v "HTTP_CODE:")

echo -e "\nDELETE Response:"
echo "  HTTP Code: $DELETE_HTTP_CODE"
echo "  Response Body: $DELETE_DATA"

# Check the result
echo -e "\n==================================="
echo "VERIFICATION:"
echo "==================================="

if [ "$DELETE_HTTP_CODE" == "200" ] || [ "$DELETE_HTTP_CODE" == "204" ]; then
    echo "✅ BUG DOES NOT EXIST - DELETE successful with code $DELETE_HTTP_CODE"
    
    # Verify it's actually deleted
    VERIFY_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/repositories/$TEST_USERNAME/$REPO_NAME)
    
    if [ "$VERIFY_RESPONSE" == "404" ]; then
        echo "✅ Repository confirmed deleted"
    else
        echo "⚠️  Repository still exists after deletion (HTTP $VERIFY_RESPONSE)"
    fi
elif [ "$DELETE_HTTP_CODE" == "404" ]; then
    echo "🐛 BUG CONFIRMED - DELETE returned 404 for existing repository"
    echo ""
    echo "Expected: 200 OK or 204 No Content"
    echo "Actual:   404 Not Found"
    echo ""
    echo "This is the bug described in BUG-001"
else
    echo "⚠️  Unexpected response code: $DELETE_HTTP_CODE"
fi

echo ""
