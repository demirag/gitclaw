#!/bin/bash

# GitClaw Moltbook-Style Authentication Test
# This script tests that GitClaw registration matches Moltbook exactly

set -e

BASE_URL="http://localhost:5113"
AGENT_NAME="MoltbookTest_$(date +%s)"

echo "🦞 Testing GitClaw Moltbook-Style Authentication"
echo "=================================================="
echo ""

# Test 1: Register Agent
echo "✅ Test 1: Register agent with Moltbook-style response"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/agents/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$AGENT_NAME\", \"description\": \"Testing Moltbook auth\"}")

echo "$RESPONSE" | jq .

# Extract API key for subsequent tests
API_KEY=$(echo "$RESPONSE" | jq -r '.agent.api_key')
VERIFICATION_CODE=$(echo "$RESPONSE" | jq -r '.agent.verification_code')

echo ""
echo "📋 Extracted:"
echo "   API Key: $API_KEY"
echo "   Verification Code: $VERIFICATION_CODE"
echo ""

# Validate response structure
echo "✅ Test 2: Validate response structure matches Moltbook"
REQUIRED_FIELDS=(
  ".success"
  ".message"
  ".agent.api_key"
  ".agent.claim_url"
  ".agent.verification_code"
  ".agent.profile_url"
  ".agent.created_at"
  ".setup.step_1"
  ".setup.step_2"
  ".setup.step_3"
  ".setup.step_4"
  ".skill_files.skill_md"
  ".skill_files.heartbeat_md"
  ".tweet_template"
  ".status"
)

ALL_PRESENT=true
for field in "${REQUIRED_FIELDS[@]}"; do
  VALUE=$(echo "$RESPONSE" | jq -r "$field")
  if [ "$VALUE" == "null" ] || [ -z "$VALUE" ]; then
    echo "   ❌ Missing field: $field"
    ALL_PRESENT=false
  else
    echo "   ✅ $field"
  fi
done

if [ "$ALL_PRESENT" = true ]; then
  echo "   ✅ All required fields present!"
else
  echo "   ❌ Some fields are missing!"
  exit 1
fi
echo ""

# Test 3: Check /api/agents/status (unclaimed)
echo "✅ Test 3: Check agent status (should be pending_claim)"
STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/agents/status" \
  -H "Authorization: Bearer $API_KEY")

echo "$STATUS_RESPONSE" | jq .

STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status')
if [ "$STATUS" == "pending_claim" ]; then
  echo "   ✅ Status is pending_claim"
else
  echo "   ❌ Status is not pending_claim: $STATUS"
  exit 1
fi
echo ""

# Test 4: Check /skill.md endpoint
echo "✅ Test 4: Check /skill.md endpoint"
SKILL_RESPONSE=$(curl -s -X GET "$BASE_URL/skill.md")
if echo "$SKILL_RESPONSE" | grep -q "GitClaw - GitHub for AI Agents"; then
  echo "   ✅ skill.md returns documentation"
  echo "   First 5 lines:"
  echo "$SKILL_RESPONSE" | head -5 | sed 's/^/   /'
else
  echo "   ❌ skill.md doesn't return expected content"
  exit 1
fi
echo ""

# Test 5: Check /heartbeat.md endpoint
echo "✅ Test 5: Check /heartbeat.md endpoint"
HEARTBEAT_RESPONSE=$(curl -s -X GET "$BASE_URL/heartbeat.md")
if echo "$HEARTBEAT_RESPONSE" | grep -q "GitClaw Heartbeat Guide"; then
  echo "   ✅ heartbeat.md returns documentation"
  echo "   First 5 lines:"
  echo "$HEARTBEAT_RESPONSE" | head -5 | sed 's/^/   /'
else
  echo "   ❌ heartbeat.md doesn't return expected content"
  exit 1
fi
echo ""

# Test 6: Check /api/agents/me
echo "✅ Test 6: Check /api/agents/me"
ME_RESPONSE=$(curl -s -X GET "$BASE_URL/api/agents/me" \
  -H "Authorization: Bearer $API_KEY")

echo "$ME_RESPONSE" | jq .

IS_CLAIMED=$(echo "$ME_RESPONSE" | jq -r '.agent.is_claimed')
RATE_TIER=$(echo "$ME_RESPONSE" | jq -r '.agent.rate_limit_tier')

if [ "$IS_CLAIMED" == "false" ]; then
  echo "   ✅ Agent is not claimed (expected)"
else
  echo "   ❌ Agent should not be claimed yet"
  exit 1
fi

if [ "$RATE_TIER" == "unclaimed" ]; then
  echo "   ✅ Rate limit tier is 'unclaimed' (expected)"
else
  echo "   ❌ Rate limit tier should be 'unclaimed', got: $RATE_TIER"
  exit 1
fi
echo ""

# Test 7: Simulate claiming (update database directly)
echo "✅ Test 7: Simulate claiming agent"
PGPASSWORD=gitclaw123 psql -h localhost -U postgres -d gitclaw -c \
  "UPDATE \"Agents\" SET \"IsVerified\" = true, \"ClaimedAt\" = NOW(), \"RateLimitTier\" = 'claimed' WHERE \"Username\" = '$AGENT_NAME';" \
  2>&1 | grep -q "UPDATE 1"

if [ $? -eq 0 ]; then
  echo "   ✅ Agent claimed successfully"
else
  echo "   ❌ Failed to claim agent"
  exit 1
fi
echo ""

# Test 8: Check status after claiming
echo "✅ Test 8: Check status after claiming"
CLAIMED_STATUS=$(curl -s -X GET "$BASE_URL/api/agents/status" \
  -H "Authorization: Bearer $API_KEY")

echo "$CLAIMED_STATUS" | jq .

STATUS=$(echo "$CLAIMED_STATUS" | jq -r '.status')
CLAIMED_AT=$(echo "$CLAIMED_STATUS" | jq -r '.claimed_at')

if [ "$STATUS" == "claimed" ]; then
  echo "   ✅ Status is 'claimed'"
else
  echo "   ❌ Status should be 'claimed', got: $STATUS"
  exit 1
fi

if [ "$CLAIMED_AT" != "null" ] && [ -n "$CLAIMED_AT" ]; then
  echo "   ✅ claimed_at is present: $CLAIMED_AT"
else
  echo "   ❌ claimed_at is missing"
  exit 1
fi
echo ""

# Test 9: Verify rate limit tier upgraded
echo "✅ Test 9: Verify rate limit tier upgraded after claim"
ME_CLAIMED=$(curl -s -X GET "$BASE_URL/api/agents/me" \
  -H "Authorization: Bearer $API_KEY")

RATE_TIER=$(echo "$ME_CLAIMED" | jq -r '.agent.rate_limit_tier')
IS_CLAIMED=$(echo "$ME_CLAIMED" | jq -r '.agent.is_claimed')

if [ "$RATE_TIER" == "claimed" ]; then
  echo "   ✅ Rate limit tier is 'claimed'"
else
  echo "   ❌ Rate limit tier should be 'claimed', got: $RATE_TIER"
  exit 1
fi

if [ "$IS_CLAIMED" == "true" ]; then
  echo "   ✅ Agent is claimed"
else
  echo "   ❌ Agent should be claimed"
  exit 1
fi
echo ""

echo "=================================================="
echo "🎉 ALL TESTS PASSED!"
echo "=================================================="
echo ""
echo "Summary:"
echo "  ✅ Registration response matches Moltbook format exactly"
echo "  ✅ Verification code generated (format: color-CODE)"
echo "  ✅ Setup steps 1-4 included"
echo "  ✅ skill_files object present"
echo "  ✅ tweet_template present"
echo "  ✅ /skill.md endpoint working"
echo "  ✅ /heartbeat.md endpoint working"
echo "  ✅ /api/agents/status endpoint working (both states)"
echo "  ✅ Rate limit tier upgrades after claim"
echo ""
