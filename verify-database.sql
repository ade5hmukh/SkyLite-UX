-- SQL queries to verify recurring tasks in the database
-- Connect to your PostgreSQL database and run these queries

-- 1. View all recurring tasks with their configuration
SELECT 
    id,
    title,
    description,
    completed,
    recurring,
    "recurringPattern",
    "recurringDaysOfWeek",
    "recurringDayOfMonth",
    "lastResetDate",
    "snoozedUntil",
    "skipNext",
    points,
    "createdAt",
    "updatedAt"
FROM todos 
WHERE recurring = true 
ORDER BY "createdAt" DESC;

-- 2. Count recurring tasks by pattern type
SELECT 
    "recurringPattern",
    COUNT(*) as task_count,
    SUM(CASE WHEN completed THEN 1 ELSE 0 END) as completed_count,
    SUM(CASE WHEN NOT completed THEN 1 ELSE 0 END) as pending_count
FROM todos 
WHERE recurring = true 
GROUP BY "recurringPattern";

-- 3. View tasks that should reset today (based on pattern)
-- Daily tasks
SELECT 
    id, 
    title, 
    'DAILY' as pattern_type,
    completed,
    "lastResetDate"
FROM todos 
WHERE recurring = true 
  AND "recurringPattern" = 'DAILY'
  AND completed = true;

-- Weekly tasks (check if today is in their recurring days)
SELECT 
    id, 
    title, 
    'WEEKLY' as pattern_type,
    "recurringDaysOfWeek",
    EXTRACT(DOW FROM NOW()) as today_dow,
    completed,
    "lastResetDate"
FROM todos 
WHERE recurring = true 
  AND "recurringPattern" = 'WEEKLY'
  AND completed = true
  AND EXTRACT(DOW FROM NOW())::int = ANY("recurringDaysOfWeek");

-- Monthly tasks (check if today matches their day of month)
SELECT 
    id, 
    title, 
    'MONTHLY' as pattern_type,
    "recurringDayOfMonth",
    EXTRACT(DAY FROM NOW()) as today_dom,
    completed,
    "lastResetDate"
FROM todos 
WHERE recurring = true 
  AND "recurringPattern" = 'MONTHLY'
  AND completed = true
  AND EXTRACT(DAY FROM NOW())::int = "recurringDayOfMonth";

-- 4. View snoozed tasks
SELECT 
    id,
    title,
    "snoozedUntil",
    "snoozedUntil" > NOW() as is_still_snoozed,
    completed
FROM todos 
WHERE recurring = true 
  AND "snoozedUntil" IS NOT NULL
ORDER BY "snoozedUntil";

-- 5. View tasks marked to skip next occurrence
SELECT 
    id,
    title,
    "recurringPattern",
    "skipNext",
    completed,
    "lastResetDate"
FROM todos 
WHERE recurring = true 
  AND "skipNext" = true;

-- 6. View recent activity logs for recurring tasks
SELECT 
    al.timestamp,
    al.level,
    al."serviceName",
    al.message,
    al.username,
    al."entityName",
    al.metadata
FROM activity_logs al
WHERE al."serviceName" IN ('todolist', 'chore')
  AND al.message LIKE '%recurring%'
ORDER BY al.timestamp DESC
LIMIT 20;

-- 7. Statistics on recurring tasks
SELECT 
    'Total Recurring Tasks' as metric,
    COUNT(*) as value
FROM todos 
WHERE recurring = true
UNION ALL
SELECT 
    'Completed Today',
    COUNT(*)
FROM todos 
WHERE recurring = true 
  AND completed = true
  AND "lastResetDate" >= CURRENT_DATE
UNION ALL
SELECT 
    'Never Reset',
    COUNT(*)
FROM todos 
WHERE recurring = true 
  AND "lastResetDate" IS NULL
UNION ALL
SELECT 
    'Currently Snoozed',
    COUNT(*)
FROM todos 
WHERE recurring = true 
  AND "snoozedUntil" > NOW();

-- 8. View task history (useful to see reset patterns over time)
SELECT 
    t.id,
    t.title,
    t."recurringPattern",
    COUNT(al.id) as total_completions,
    MAX(al.timestamp) as last_completion,
    t."lastResetDate"
FROM todos t
LEFT JOIN activity_logs al ON al."entityId" = t.id 
  AND al.message LIKE 'Completed%'
WHERE t.recurring = true
GROUP BY t.id, t.title, t."recurringPattern", t."lastResetDate"
ORDER BY total_completions DESC;

-- 9. Check for data integrity issues
SELECT 
    id,
    title,
    recurring,
    "recurringPattern",
    CASE 
        WHEN "recurringPattern" = 'WEEKLY' AND (
            "recurringDaysOfWeek" IS NULL OR 
            array_length("recurringDaysOfWeek", 1) = 0
        ) THEN 'Missing days of week'
        WHEN "recurringPattern" = 'MONTHLY' AND "recurringDayOfMonth" IS NULL 
            THEN 'Missing day of month'
        ELSE 'OK'
    END as validation_status
FROM todos 
WHERE recurring = true
  AND CASE 
        WHEN "recurringPattern" = 'WEEKLY' AND (
            "recurringDaysOfWeek" IS NULL OR 
            array_length("recurringDaysOfWeek", 1) = 0
        ) THEN true
        WHEN "recurringPattern" = 'MONTHLY' AND "recurringDayOfMonth" IS NULL 
            THEN true
        ELSE false
    END;

