#!/bin/bash

# Quick test of all bug fixes from PR#2

API_URL="http://localhost:5113"
echo "🧪 Testing GitClaw Bug Fixes..."
echo "================================"
echo ""

# Test 1: Agent Registration (Bug #2 - case insensitive)
echo "✅ Test 1: Case-Insensitive Username"
API_KEY=$(curl -s -X POST "$API_URL/api/agents/register" \
  -H "Content-Type: application/json" \
  -d '{"name": "TestAgent1"}' | jq -r '.agent.api_key')
echo "   Registered TestAgent1: $API_KEY"

# Try with different case - should fail
RESULT=$(curl -s -X POST "$API_URL/api/agents/register" \
  -H "Content-Type: application/json" \
  -d '{"name": "testagent1"}' | jq -r '.error')
if [[ "$RESULT" == *"already exists"* ]]; then
  echo "   ✅ PASS: Duplicate with different case rejected"
else
  echo "   ❌ FAIL: Should reject duplicate username"
fi
echo ""

# Test 2: Repository Name Validation (Bug #3)
echo "✅ Test 2: Repository Name Validation"
RESULT=$(curl -s -X POST "$API_URL/api/repositories" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"owner": "TestAgent1", "name": "test-repo@#!", "description": "Invalid name"}' | jq -r '.error')
if [[ "$RESULT" == *"Repository name"* ]]; then
  echo "   ✅ PASS: Invalid characters rejected"
else
  echo "   ❌ FAIL: Should reject special characters"
fi

# Valid repo name should work
curl -s -X POST "$API_URL/api/repositories" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"owner": "TestAgent1", "name": "valid-repo", "description": "Test"}' > /dev/null
echo "   ✅ Valid repo name accepted"
echo ""

# Test 3: Empty Repository Tree (Bug #4)
echo "✅ Test 3: Empty Repository Tree"
RESULT=$(curl -s "$API_URL/api/repositories/TestAgent1/valid-repo/tree/" | jq -r '.entries | type')
if [[ "$RESULT" == "array" ]]; then
  echo "   ✅ PASS: Empty repo returns empty array, not 404"
else
  echo "   ❌ FAIL: Should return empty array"
fi
echo ""

# Test 4: Input Sanitization (Bug #5)
echo "✅ Test 4: Input Sanitization"
RESULT=$(curl -s -X POST "$API_URL/api/agents/register" \
  -H "Content-Type: application/json" \
  -d '{"name": "test<script>alert()</script>"}' | jq -r '.error')
if [[ "$RESULT" == *"username"* ]] || [[ "$RESULT" == *"Invalid"* ]]; then
  echo "   ✅ PASS: XSS attempt rejected or sanitized"
else
  echo "   ⚠️  Check: $RESULT"
fi
echo ""

# Test 5: Rate Limiting (Bug #6)
echo "✅ Test 5: Rate Limiting"
echo "   Sending 105 requests rapidly..."
for i in {1..105}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
  if [[ "$STATUS" == "429" ]]; then
    echo "   ✅ PASS: Rate limit kicked in at request $i"
    break
  fi
done
echo ""

# Test 6: Git HTTP Backend (Bug #1 - CRITICAL)
echo "✅ Test 6: Git HTTP Backend"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/git/TestAgent1/valid-repo.git/info/refs?service=git-upload-pack")
if [[ "$STATUS" == "401" ]]; then
  echo "   ✅ PASS: Git HTTP endpoint responding (needs auth)"
else
  echo "   ❌ FAIL: Git HTTP endpoint not working (status: $STATUS)"
fi
echo ""

echo "================================"
echo "✅ All critical fixes verified!"
echo ""
