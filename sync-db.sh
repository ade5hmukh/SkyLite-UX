#!/bin/bash
# Database Sync Script: Production -> Dev
# This script copies data from production database to dev database

set -e  # Exit on error

echo "=========================================="
echo "Database Sync: Production -> Dev"
echo "=========================================="
echo ""

# Configuration
PROD_CONTAINER="homelab-docker_skylite-ux-db_1"
DEV_CONTAINER="skylite-ux_devcontainer-db-1"
BACKUP_FILE="/tmp/skylite_prod_backup_$(date +%Y%m%d_%H%M%S).sql"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Backing up production database...${NC}"
docker exec $PROD_CONTAINER pg_dump -U skylite_admin -d skylite > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Production database backed up to: $BACKUP_FILE${NC}"
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "  Backup size: $BACKUP_SIZE"
else
    echo -e "${RED}✗ Failed to backup production database${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Clearing existing dev database...${NC}"
# Connect to template1 database to drop and recreate postgres
docker exec $DEV_CONTAINER psql -U postgres -d template1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'postgres';"
docker exec $DEV_CONTAINER psql -U postgres -d template1 -c "DROP DATABASE IF EXISTS postgres;"
docker exec $DEV_CONTAINER psql -U postgres -d template1 -c "CREATE DATABASE postgres;"
echo -e "${GREEN}✓ Dev database reset${NC}"

echo ""
echo -e "${YELLOW}Step 3: Restoring production data to dev database...${NC}"
cat "$BACKUP_FILE" | docker exec -i $DEV_CONTAINER psql -U postgres -d postgres

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Production data restored to dev database${NC}"
else
    echo -e "${RED}✗ Failed to restore to dev database${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 4: Cleaning up backup file...${NC}"
rm "$BACKUP_FILE"
echo -e "${GREEN}✓ Backup file removed${NC}"

echo ""
echo -e "${GREEN}=========================================="
echo "Database sync completed successfully!"
echo "==========================================${NC}"
echo ""
echo "Dev database now has the same data as production."
echo ""
echo "Next steps:"
echo "  1. Start dev server: npm run dev"
echo "  2. Access at: http://localhost:3001"

