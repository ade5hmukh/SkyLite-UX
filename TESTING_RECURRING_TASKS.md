# Testing Recurring Tasks

This document explains how to test the recurring task functionality.

## Test Scripts

### 1. `test-recurring-tasks.sh` - Comprehensive API Test Suite

This script tests all recurring task functionality via curl commands:
- Creates DAILY, WEEKLY, and MONTHLY recurring tasks
- Marks them as completed
- Triggers the reset mechanism
- Tests skip and snooze features
- Verifies the results

**Usage:**
```bash
./test-recurring-tasks.sh
```

**Requirements:**
- Server running on port 3004
- `jq` installed for JSON parsing (`sudo apt install jq`)

### 2. `quick-db-check.sh` - Database Verification

Quick script to check the current state of recurring tasks in the database.

**Usage:**
```bash
./quick-db-check.sh
```

**Requirements:**
- PostgreSQL client installed (`psql`)
- Database credentials set in `DATABASE_URL` environment variable

### 3. `verify-database.sql` - Detailed SQL Queries

Comprehensive SQL queries for deep inspection of recurring tasks.

**Usage:**
```bash
psql postgresql://skylite_admin:crhrp3cCJ@localhost:5432/skylite -f verify-database.sql
```

Or run individual queries from the file in your favorite PostgreSQL client.

## Manual Testing Steps

### Step 1: Create Test Data

Run the test script to create sample recurring tasks:
```bash
./test-recurring-tasks.sh
```

This will create:
1. **Daily Task** - "Brush Teeth" (resets every midnight)
2. **Weekly Task** - "Take Out Trash" (resets Mon, Wed, Fri)
3. **Monthly Task** - "Pay Rent" (resets on the 15th)

### Step 2: Verify Database State

Check that tasks were created correctly:
```bash
./quick-db-check.sh
```

Or manually query:
```sql
SELECT title, recurring, "recurringPattern", "recurringDaysOfWeek", "recurringDayOfMonth" 
FROM todos 
WHERE recurring = true;
```

### Step 3: Complete Tasks

Complete the tasks (done automatically by test script):
```bash
# Via curl
curl -X PUT http://localhost:3004/api/todos/[TASK_ID] \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'
```

Or use the UI to check/complete the tasks.

### Step 4: Trigger Reset

Manually trigger the reset (normally runs at midnight):
```bash
curl -X POST http://localhost:3004/api/chores/reset-recurring
```

### Step 5: Verify Reset Behavior

Check which tasks were reset based on current day:
```bash
./quick-db-check.sh
```

**Expected behavior:**
- **DAILY tasks**: Should reset every time (if completed)
- **WEEKLY tasks**: Should only reset if today is in their `recurringDaysOfWeek` array
  - 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
- **MONTHLY tasks**: Should only reset if today's day of month matches `recurringDayOfMonth`

### Step 6: Test Skip Feature

Skip the next occurrence of a task:
```bash
curl -X POST http://localhost:3004/api/todos/[TASK_ID]/skip
```

Verify the `skipNext` flag is set:
```sql
SELECT title, skipNext FROM todos WHERE id = '[TASK_ID]';
```

Next reset will skip this task and set `skipNext` back to false.

### Step 7: Test Snooze Feature

Snooze a task until tomorrow:
```bash
TOMORROW=$(date -d "+1 day" -Iseconds)
curl -X POST http://localhost:3004/api/todos/[TASK_ID]/snooze \
  -H "Content-Type: application/json" \
  -d "{\"snoozedUntil\": \"${TOMORROW}\"}"
```

Verify the `snoozedUntil` date:
```sql
SELECT title, snoozedUntil FROM todos WHERE id = '[TASK_ID]';
```

Task will not reset until after the snooze date.

## Understanding the Data

### Database Fields

- `recurring` (boolean): Whether the task is recurring
- `recurringPattern` (enum): "DAILY", "WEEKLY", or "MONTHLY"
- `recurringDaysOfWeek` (int[]): Array of days [0-6] for WEEKLY pattern
- `recurringDayOfMonth` (int): Day [1-31] for MONTHLY pattern
- `lastResetDate` (datetime): When the task was last reset
- `snoozedUntil` (datetime): Don't reset until after this date
- `skipNext` (boolean): Skip the next reset occurrence

### Weekly Days Reference

```
0 = Sunday
1 = Monday
2 = Tuesday
3 = Wednesday
4 = Thursday
5 = Friday
6 = Saturday
```

### Examples

**Daily task:**
```json
{
  "recurring": true,
  "recurringPattern": "DAILY"
}
```
Resets every midnight.

**Weekly task (Mon, Wed, Fri):**
```json
{
  "recurring": true,
  "recurringPattern": "WEEKLY",
  "recurringDaysOfWeek": [1, 3, 5]
}
```
Resets only on Mondays, Wednesdays, and Fridays.

**Monthly task (15th):**
```json
{
  "recurring": true,
  "recurringPattern": "MONTHLY",
  "recurringDayOfMonth": 15
}
```
Resets only on the 15th of each month.

## Automated Testing

The chore scheduler runs automatically at midnight in production. In development, it also runs at midnight local time.

To test without waiting for midnight:
```bash
curl -X POST http://localhost:3004/api/chores/reset-recurring
```

## Troubleshooting

### Tasks not resetting?

1. Check if the pattern matches today:
   ```bash
   # Get current day
   date +%u  # 1-7 (Monday-Sunday)
   date +%d  # Day of month
   ```

2. Check for snooze or skip flags:
   ```sql
   SELECT title, skipNext, snoozedUntil FROM todos WHERE id = '[TASK_ID]';
   ```

3. Check the reset logs:
   ```sql
   SELECT * FROM activity_logs WHERE "serviceName" = 'chore' ORDER BY timestamp DESC LIMIT 10;
   ```

### Tasks resetting when they shouldn't?

1. Verify the pattern configuration:
   ```sql
   SELECT title, "recurringPattern", "recurringDaysOfWeek", "recurringDayOfMonth" 
   FROM todos 
   WHERE id = '[TASK_ID]';
   ```

2. Check if completed flag is set:
   ```sql
   SELECT title, completed FROM todos WHERE id = '[TASK_ID]';
   ```
   (Tasks only reset if `completed = true`)

## Cleanup

To remove test tasks:
```bash
# The test script outputs cleanup commands at the end
curl -X DELETE http://localhost:3004/api/todos/[TASK_ID]
```

Or delete all recurring tasks:
```sql
DELETE FROM todos WHERE recurring = true AND title LIKE '%Task - %';
```

