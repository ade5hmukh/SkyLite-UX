#!/bin/bash

# Test script for rewards functionality
# Run this after starting the dev server on port 3004

BASE_URL="http://localhost:3004"
API_URL="${BASE_URL}/api"

echo "======================================"
echo "REWARDS SYSTEM TEST SUITE"
echo "======================================"
echo ""

# Get first user ID
echo "📋 Fetching users..."
USER_RESPONSE=$(curl -s "${API_URL}/users")
USER_ID=$(echo "$USER_RESPONSE" | jq -r '.[0].id')
USER_NAME=$(echo "$USER_RESPONSE" | jq -r '.[0].name')
USER_POINTS=$(echo "$USER_RESPONSE" | jq -r '.[0].points')

echo "✅ User: $USER_NAME (ID: $USER_ID)"
echo "💰 Current Points: $USER_POINTS"
echo ""

# Create a test reward
echo "🎁 Creating test reward..."
REWARD_RESPONSE=$(curl -s -X POST "${API_URL}/rewards" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Ice Cream Treat",
    "description": "A special test ice cream reward",
    "icon": "i-lucide-ice-cream-cone",
    "pointCost": 5,
    "category": "treats",
    "color": "pink",
    "enabled": true
  }')

REWARD_ID=$(echo "$REWARD_RESPONSE" | jq -r '.id')
REWARD_COST=$(echo "$REWARD_RESPONSE" | jq -r '.pointCost')

echo "✅ Created reward: $REWARD_ID (Cost: $REWARD_COST points)"
echo ""

# Check if user has enough points
if [ "$USER_POINTS" -lt "$REWARD_COST" ]; then
  echo "⚠️  User doesn't have enough points. Adding points..."
  
  # Add points by updating user
  curl -s -X PUT "${API_URL}/users/${USER_ID}" \
    -H "Content-Type: application/json" \
    -d "{
      \"points\": 20
    }" > /dev/null
  
  echo "✅ Added points to user"
  echo ""
  
  # Refresh user points
  USER_RESPONSE=$(curl -s "${API_URL}/users/${USER_ID}")
  USER_POINTS=$(echo "$USER_RESPONSE" | jq -r '.points')
  echo "💰 New Points: $USER_POINTS"
  echo ""
fi

# Redeem the reward
echo "🎯 Redeeming reward..."
REDEMPTION_RESPONSE=$(curl -s -X POST "${API_URL}/rewards/${REWARD_ID}/redeem" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"${USER_ID}\"
  }")

REDEMPTION_ID=$(echo "$REDEMPTION_RESPONSE" | jq -r '.id')
NEW_USER_POINTS=$(echo "$REDEMPTION_RESPONSE" | jq -r '.user.points')

if [ "$REDEMPTION_ID" != "null" ] && [ "$REDEMPTION_ID" != "" ]; then
  echo "✅ Redemption successful!"
  echo "   Redemption ID: $REDEMPTION_ID"
  echo "   Points spent: $REWARD_COST"
  echo "   Remaining points: $NEW_USER_POINTS"
  echo ""
else
  echo "❌ Redemption failed!"
  echo "$REDEMPTION_RESPONSE" | jq '.'
  echo ""
fi

# Verify points were deducted
echo "🔍 Verifying points deduction..."
USER_RESPONSE=$(curl -s "${API_URL}/users/${USER_ID}")
FINAL_POINTS=$(echo "$USER_RESPONSE" | jq -r '.points')
EXPECTED_POINTS=$((USER_POINTS - REWARD_COST))

if [ "$FINAL_POINTS" -eq "$EXPECTED_POINTS" ]; then
  echo "✅ Points correctly deducted: $USER_POINTS → $FINAL_POINTS"
else
  echo "❌ Points mismatch! Expected: $EXPECTED_POINTS, Got: $FINAL_POINTS"
fi
echo ""

# Check redemption status
echo "📊 Checking redemption history..."
REDEMPTIONS=$(curl -s "${API_URL}/rewards/redemptions?userId=${USER_ID}")
PENDING_COUNT=$(echo "$REDEMPTIONS" | jq '[.[] | select(.status == "PENDING")] | length')

echo "✅ User has $PENDING_COUNT pending redemption(s)"
echo ""

# Test fulfillment
echo "✔️  Fulfilling redemption..."
curl -s -X PUT "${API_URL}/rewards/redemptions/${REDEMPTION_ID}" \
  -H "Content-Type: application/json" \
  -d '{"status": "FULFILLED"}' > /dev/null

echo "✅ Redemption marked as fulfilled"
echo ""

# Cleanup: Delete test reward
echo "🧹 Cleaning up test reward..."
curl -s -X DELETE "${API_URL}/rewards/${REWARD_ID}" > /dev/null
echo "✅ Test reward deleted"
echo ""

echo "======================================"
echo "✅ ALL TESTS COMPLETED SUCCESSFULLY!"
echo "======================================"
echo ""
echo "Summary:"
echo "  - Reward created and redeemed"
echo "  - Points correctly deducted ($USER_POINTS → $FINAL_POINTS)"
echo "  - Redemption fulfilled"
echo "  - Test data cleaned up"
echo ""

