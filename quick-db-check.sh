#!/bin/bash

# Quick database check for recurring tasks
# This script connects to the PostgreSQL database and shows recurring task status

DB_URL=${DATABASE_URL:-"postgresql://skylite_admin:crhrp3cCJ@localhost:5432/skylite"}

echo "======================================"
echo "RECURRING TASKS - DATABASE STATUS"
echo "======================================"
echo ""

echo "1. All recurring tasks:"
echo "--------------------------------------"
psql "$DB_URL" -c "
SELECT 
    LEFT(title, 40) as title,
    \"recurringPattern\" as pattern,
    completed,
    \"skipNext\" as skip,
    \"snoozedUntil\" IS NOT NULL as snoozed,
    \"lastResetDate\"::date as last_reset
FROM todos 
WHERE recurring = true 
ORDER BY \"createdAt\" DESC;
"

echo ""
echo "2. Tasks by pattern type:"
echo "--------------------------------------"
psql "$DB_URL" -c "
SELECT 
    \"recurringPattern\" as pattern,
    COUNT(*) as total,
    SUM(CASE WHEN completed THEN 1 ELSE 0 END) as completed,
    SUM(CASE WHEN NOT completed THEN 1 ELSE 0 END) as pending
FROM todos 
WHERE recurring = true 
GROUP BY \"recurringPattern\";
"

echo ""
echo "3. Today's context:"
echo "--------------------------------------"
echo "Current time: $(date)"
echo "Day of week: $(date +%A) ($(date +%u) in 0-6 format: $(($(date +%u) % 7)))"
echo "Day of month: $(date +%d)"

echo ""
echo "4. Weekly tasks details:"
echo "--------------------------------------"
psql "$DB_URL" -c "
SELECT 
    LEFT(title, 40) as title,
    \"recurringDaysOfWeek\" as days,
    completed,
    \"lastResetDate\"::date as last_reset
FROM todos 
WHERE recurring = true 
  AND \"recurringPattern\" = 'WEEKLY'
ORDER BY \"createdAt\" DESC;
"

echo ""
echo "5. Monthly tasks details:"
echo "--------------------------------------"
psql "$DB_URL" -c "
SELECT 
    LEFT(title, 40) as title,
    \"recurringDayOfMonth\" as day,
    completed,
    \"lastResetDate\"::date as last_reset
FROM todos 
WHERE recurring = true 
  AND \"recurringPattern\" = 'MONTHLY'
ORDER BY \"createdAt\" DESC;
"

echo ""
echo "6. Recent reset activity:"
echo "--------------------------------------"
psql "$DB_URL" -c "
SELECT 
    timestamp::timestamp(0),
    message
FROM activity_logs
WHERE \"serviceName\" = 'chore'
  AND message LIKE '%reset%'
ORDER BY timestamp DESC
LIMIT 5;
"

