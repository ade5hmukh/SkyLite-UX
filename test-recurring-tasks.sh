#!/bin/bash

# Test script for recurring tasks functionality
# Run this after starting the dev server on port 3004

BASE_URL="http://localhost:3004"
API_URL="${BASE_URL}/api"

echo "======================================"
echo "RECURRING TASKS TEST SUITE"
echo "======================================"
echo ""

# Get the first todo column ID for testing
echo "1. Getting available todo columns..."
COLUMNS_RESPONSE=$(curl -s "${API_URL}/todo-columns")
COLUMN_ID=$(echo $COLUMNS_RESPONSE | jq -r '.[0].id')
echo "✓ Using column ID: $COLUMN_ID"
echo ""

# Test 1: Create a DAILY recurring task
echo "======================================"
echo "TEST 1: Creating DAILY recurring task"
echo "======================================"
DAILY_TASK=$(curl -s -X POST "${API_URL}/todos" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Daily Task - Brush Teeth\",
    \"description\": \"This should reset every day at midnight\",
    \"todoColumnId\": \"${COLUMN_ID}\",
    \"priority\": \"HIGH\",
    \"points\": 10,
    \"recurring\": true,
    \"recurringPattern\": \"DAILY\"
  }")

DAILY_TASK_ID=$(echo $DAILY_TASK | jq -r '.id')
echo "✓ Created daily task with ID: $DAILY_TASK_ID"
echo "Response:"
echo $DAILY_TASK | jq '{id, title, recurring, recurringPattern, completed}'
echo ""

# Test 2: Create a WEEKLY recurring task (Monday, Wednesday, Friday)
echo "======================================"
echo "TEST 2: Creating WEEKLY recurring task"
echo "======================================"
WEEKLY_TASK=$(curl -s -X POST "${API_URL}/todos" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Weekly Task - Take Out Trash\",
    \"description\": \"This should reset only on Mon, Wed, Fri\",
    \"todoColumnId\": \"${COLUMN_ID}\",
    \"priority\": \"MEDIUM\",
    \"points\": 20,
    \"recurring\": true,
    \"recurringPattern\": \"WEEKLY\",
    \"recurringDaysOfWeek\": [1, 3, 5]
  }")

WEEKLY_TASK_ID=$(echo $WEEKLY_TASK | jq -r '.id')
echo "✓ Created weekly task with ID: $WEEKLY_TASK_ID"
echo "Response:"
echo $WEEKLY_TASK | jq '{id, title, recurring, recurringPattern, recurringDaysOfWeek, completed}'
echo ""

# Test 3: Create a MONTHLY recurring task (15th of each month)
echo "======================================"
echo "TEST 3: Creating MONTHLY recurring task"
echo "======================================"
MONTHLY_TASK=$(curl -s -X POST "${API_URL}/todos" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Monthly Task - Pay Rent\",
    \"description\": \"This should reset on the 15th of each month\",
    \"todoColumnId\": \"${COLUMN_ID}\",
    \"priority\": \"URGENT\",
    \"points\": 50,
    \"recurring\": true,
    \"recurringPattern\": \"MONTHLY\",
    \"recurringDayOfMonth\": 15
  }")

MONTHLY_TASK_ID=$(echo $MONTHLY_TASK | jq -r '.id')
echo "✓ Created monthly task with ID: $MONTHLY_TASK_ID"
echo "Response:"
echo $MONTHLY_TASK | jq '{id, title, recurring, recurringPattern, recurringDayOfMonth, completed}'
echo ""

# Test 4: Mark all tasks as completed
echo "======================================"
echo "TEST 4: Marking all tasks as completed"
echo "======================================"

echo "Completing daily task..."
curl -s -X PUT "${API_URL}/todos/${DAILY_TASK_ID}" \
  -H "Content-Type: application/json" \
  -d '{"completed": true}' | jq '{id, title, completed}'

echo "Completing weekly task..."
curl -s -X PUT "${API_URL}/todos/${WEEKLY_TASK_ID}" \
  -H "Content-Type: application/json" \
  -d '{"completed": true}' | jq '{id, title, completed}'

echo "Completing monthly task..."
curl -s -X PUT "${API_URL}/todos/${MONTHLY_TASK_ID}" \
  -H "Content-Type: application/json" \
  -d '{"completed": true}' | jq '{id, title, completed}'
echo ""

# Test 5: Trigger recurring reset
echo "======================================"
echo "TEST 5: Triggering recurring task reset"
echo "======================================"
RESET_RESPONSE=$(curl -s -X POST "${API_URL}/chores/reset-recurring")
echo "Reset response:"
echo $RESET_RESPONSE | jq '.'
echo ""

# Test 6: Verify tasks after reset
echo "======================================"
echo "TEST 6: Verifying tasks after reset"
echo "======================================"

echo "Checking daily task status..."
DAILY_CHECK=$(curl -s "${API_URL}/todos" | jq ".[] | select(.id==\"${DAILY_TASK_ID}\")")
echo $DAILY_CHECK | jq '{id, title, completed, recurring, recurringPattern, lastResetDate}'

echo ""
echo "Checking weekly task status..."
WEEKLY_CHECK=$(curl -s "${API_URL}/todos" | jq ".[] | select(.id==\"${WEEKLY_TASK_ID}\")")
echo $WEEKLY_CHECK | jq '{id, title, completed, recurring, recurringPattern, recurringDaysOfWeek, lastResetDate}'

echo ""
echo "Checking monthly task status..."
MONTHLY_CHECK=$(curl -s "${API_URL}/todos" | jq ".[] | select(.id==\"${MONTHLY_TASK_ID}\")")
echo $MONTHLY_CHECK | jq '{id, title, completed, recurring, recurringPattern, recurringDayOfMonth, lastResetDate}'
echo ""

# Test 7: Test skip functionality
echo "======================================"
echo "TEST 7: Testing skip next occurrence"
echo "======================================"
SKIP_RESPONSE=$(curl -s -X POST "${API_URL}/todos/${DAILY_TASK_ID}/skip")
echo "Skip response:"
echo $SKIP_RESPONSE | jq '{success, message, todo: {id: .todo.id, title: .todo.title, skipNext: .todo.skipNext}}'
echo ""

# Test 8: Test snooze functionality
echo "======================================"
echo "TEST 8: Testing snooze until date"
echo "======================================"
# Snooze until tomorrow
TOMORROW=$(date -d "+1 day" -Iseconds)
SNOOZE_RESPONSE=$(curl -s -X POST "${API_URL}/todos/${WEEKLY_TASK_ID}/snooze" \
  -H "Content-Type: application/json" \
  -d "{\"snoozedUntil\": \"${TOMORROW}\"}")
echo "Snooze response:"
echo $SNOOZE_RESPONSE | jq '{success, message, todo: {id: .todo.id, title: .todo.title, snoozedUntil: .todo.snoozedUntil}}'
echo ""

# Database verification queries
echo "======================================"
echo "DATABASE VERIFICATION QUERIES"
echo "======================================"
echo "Run these SQL queries to verify the data in PostgreSQL:"
echo ""
echo "-- View all recurring tasks"
echo "SELECT id, title, recurring, \"recurringPattern\", \"recurringDaysOfWeek\", \"recurringDayOfMonth\", completed, \"skipNext\", \"snoozedUntil\", \"lastResetDate\" FROM todos WHERE recurring = true ORDER BY \"createdAt\" DESC;"
echo ""
echo "-- View specific test tasks"
echo "SELECT title, recurring, \"recurringPattern\", completed, \"lastResetDate\" FROM todos WHERE id IN ('${DAILY_TASK_ID}', '${WEEKLY_TASK_ID}', '${MONTHLY_TASK_ID}');"
echo ""
echo "-- Count recurring tasks by pattern"
echo "SELECT \"recurringPattern\", COUNT(*) FROM todos WHERE recurring = true GROUP BY \"recurringPattern\";"
echo ""

# Summary
echo "======================================"
echo "TEST SUMMARY"
echo "======================================"
echo "Created tasks:"
echo "- Daily task ID:   $DAILY_TASK_ID"
echo "- Weekly task ID:  $WEEKLY_TASK_ID"
echo "- Monthly task ID: $MONTHLY_TASK_ID"
echo ""
echo "Current day of week: $(date +%A) ($(date +%u))"
echo "Current day of month: $(date +%d)"
echo ""
echo "Expected behavior:"
echo "- Daily task should reset every midnight"
echo "- Weekly task should reset on Mon(1), Wed(3), Fri(5)"
echo "- Monthly task should reset on the 15th"
echo ""
echo "To clean up test data, run:"
echo "curl -X DELETE ${API_URL}/todos/${DAILY_TASK_ID}"
echo "curl -X DELETE ${API_URL}/todos/${WEEKLY_TASK_ID}"
echo "curl -X DELETE ${API_URL}/todos/${MONTHLY_TASK_ID}"
echo ""

