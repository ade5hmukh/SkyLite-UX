# Rewards Catalog Feature 🎁

## Overview

The **Rewards Catalog** is a comprehensive point-based rewards system that motivates kids to complete chores and tasks by earning points that can be redeemed for real-world rewards.

## Features Implemented

### ✅ 1. Database Schema

**New Models:**
- `Reward` - Stores reward definitions (title, description, point cost, category, icon, etc.)
- `RewardRedemption` - Tracks when users redeem rewards (status: PENDING, FULFILLED, CANCELLED)
- `RedemptionStatus` enum - Manages redemption lifecycle

**User Model Updates:**
- Added `rewardRedemptions` relation to track user's redemption history

### ✅ 2. API Endpoints

#### Rewards Management
- `GET /api/rewards` - List all enabled rewards
- `POST /api/rewards` - Create a new reward (admin)
- `PUT /api/rewards/[id]` - Update reward (admin)
- `DELETE /api/rewards/[id]` - Delete reward (admin)
- `GET /api/rewards/templates` - Get predefined reward templates

#### Redemptions
- `POST /api/rewards/[id]/redeem` - Redeem a reward (deducts points)
- `GET /api/rewards/redemptions` - Get redemption history (filterable by user/status)
- `PUT /api/rewards/redemptions/[id]` - Update redemption status (fulfill/cancel)

### ✅ 3. Rewards Catalog Page (`/rewards`)

**Features:**
- **User Selection** - Switch between family members to view/redeem rewards
- **Points Display** - Shows current user's available points
- **Category Filters** - Filter rewards by:
  - Screen Time (tablet, TV, games)
  - Treats & Snacks (ice cream, candy, desserts)
  - Activities (park, crafts, baking)
  - Privileges (stay up late, skip chore, choose meals)
  - Toys & Items (stickers, small toys)
  - Special Rewards (zoo trips, sleepovers, big toys)
- **Visual Catalog** - Grid layout with icons, descriptions, and point costs
- **Affordability Check** - Shows which rewards user can afford
- **One-Click Redemption** - Instant reward redemption with confirmation
- **Pending Badge** - Shows count of pending redemptions awaiting fulfillment

### ✅ 4. Rewards Management (Settings Page - Admin Mode)

**Features:**
- **Two Tabs:**
  - **Rewards Tab** - Manage all rewards
  - **Redemptions Tab** - View and fulfill pending redemptions

**Rewards Management:**
- Create rewards from 25+ predefined templates
- Create custom rewards from scratch
- Edit existing rewards (title, description, icon, point cost, category)
- Enable/disable rewards (hide from catalog without deleting)
- Delete rewards
- Visual icons and categorization

**Redemption Management:**
- View all redemptions (pending, fulfilled, cancelled)
- **Fulfill** redemptions when parent completes the reward
- **Cancel** redemptions (refunds points automatically)
- See who redeemed what and when
- Track points spent per redemption

### ✅ 5. Reward Templates

**25+ Predefined Rewards:**

**Screen Time (5-15 points):**
- 30 Min Extra Tablet Time
- 30 Min Extra TV Time
- Movie Night (pick the movie)
- 1 Hour Game Time

**Treats & Snacks (3-10 points):**
- Ice Cream Treat
- Small Candy
- Special Dessert
- Snack of Your Choice

**Activities (15-25 points):**
- Trip to the Park
- Special Craft Time
- Baking Together
- Playground Playdate
- Library Trip

**Privileges (3-15 points):**
- Stay Up 30 Minutes Later
- Choose Breakfast
- Choose Dinner
- Skip One Chore
- Music Choice in Car

**Toys & Items (15-50 points):**
- Small Toy (Under $5)
- Sticker Pack
- New Coloring Book

**Special Big Rewards (75-150 points):**
- Trip to the Zoo
- Sleepover Party
- Special Outing
- Big Toy (Under $20)

### ✅ 6. Navigation

- Added **Rewards** icon (gift box) to sidebar navigation
- Positioned between "Todo Lists" and "Shopping Lists"
- Always accessible to all users (both parents and kids)

### ✅ 7. Points Integration

**Automatic Points Deduction:**
- When a reward is redeemed, points are instantly deducted
- Transaction-based to ensure data integrity
- Prevents redemption if insufficient points

**Refund System:**
- Cancelling a redemption automatically refunds the points
- Maintains complete audit trail

**Activity Logging:**
- All reward creation, updates, redemptions, and fulfillments are logged
- Visible in Settings > Activity Log

## How It Works

### For Kids (Users):

1. **Earn Points**
   - Complete chores and tasks to earn points
   - Points are automatically tracked per user

2. **Browse Catalog**
   - Navigate to Rewards page (gift icon in sidebar)
   - Filter by category to find desired rewards
   - See which rewards are affordable with current points

3. **Redeem Rewards**
   - Click "Redeem" button on any affordable reward
   - Points are instantly deducted
   - Redemption appears as "Pending" awaiting parent fulfillment

4. **Enjoy Reward**
   - Parent will fulfill the reward in real life
   - Redemption status updates to "Fulfilled"

### For Parents (Admin Mode):

1. **Set Up Rewards**
   - Navigate to Settings (requires Admin Mode)
   - Go to "Rewards Management" section
   - Click "Add Reward"
   - Choose from templates or create custom rewards
   - Set point costs based on reward value

2. **Manage Redemptions**
   - View pending redemptions in Settings
   - When you complete the reward in real life, click "Fulfill"
   - If needed, can cancel redemptions (refunds points)

3. **Monitor Activity**
   - See all reward activity in Activity Log
   - Track which rewards are most popular
   - Adjust point costs as needed

## Database Structure

```sql
-- Rewards table
CREATE TABLE rewards (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  pointCost INTEGER NOT NULL,
  category TEXT,
  color TEXT,
  order INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- Reward Redemptions table
CREATE TABLE reward_redemptions (
  id TEXT PRIMARY KEY,
  rewardId TEXT NOT NULL REFERENCES rewards(id),
  userId TEXT NOT NULL REFERENCES users(id),
  pointsSpent INTEGER NOT NULL,
  status TEXT DEFAULT 'PENDING', -- PENDING, FULFILLED, CANCELLED
  redeemedAt TIMESTAMP DEFAULT NOW(),
  fulfilledAt TIMESTAMP,
  notes TEXT
);
```

## Testing

### Sample Rewards Created:
- ✅ 30 Min Extra Tablet Time (5 points)
- ✅ Ice Cream Treat (8 points)
- ✅ 30 Min Extra TV Time (5 points)
- ✅ Stay Up 30 Minutes Later (10 points)

### To Test Manually:

1. **Complete some chores** to earn points
2. **Navigate to `/rewards`** page
3. **Try filtering** by different categories
4. **Attempt to redeem** a reward (will fail if insufficient points)
5. **Switch users** to see different point balances
6. **Go to Settings** (triple-tap logo, enter PIN: 1111)
7. **View "Rewards Management"** section
8. **Add/edit/delete rewards**
9. **Fulfill pending redemptions**

## Future Enhancements (Optional)

- [ ] **Reward Images** - Upload custom images for rewards
- [ ] **Expiring Rewards** - Limited-time special rewards
- [ ] **Reward Bundles** - Package multiple rewards at a discount
- [ ] **Wish List** - Kids can favorite rewards they're saving for
- [ ] **Achievement Badges** - Earn badges for redemption milestones
- [ ] **Reward History Graph** - Visualize points earned vs. spent over time
- [ ] **Recurring Rewards** - Weekly/monthly special rewards
- [ ] **Parent Notifications** - Alert when kids redeem rewards
- [ ] **Reward Limits** - Max redemptions per day/week

## Files Created/Modified

### New Files:
- `prisma/schema.prisma` - Added Reward and RewardRedemption models
- `server/api/rewards/index.get.ts` - List rewards
- `server/api/rewards/index.post.ts` - Create reward
- `server/api/rewards/[id].put.ts` - Update reward
- `server/api/rewards/[id].delete.ts` - Delete reward
- `server/api/rewards/[id]/redeem.post.ts` - Redeem reward
- `server/api/rewards/redemptions/index.get.ts` - List redemptions
- `server/api/rewards/redemptions/[id].put.ts` - Update redemption
- `server/api/rewards/templates.get.ts` - Get reward templates
- `app/types/rewards.ts` - Reward types and templates
- `app/pages/rewards.vue` - Rewards catalog page
- `app/components/settings/settingsRewardsManagement.vue` - Admin management UI
- `test-rewards.sh` - Test script

### Modified Files:
- `app/pages/settings.vue` - Added rewards management component
- `app/components/global/globalSideBar.vue` - Added rewards navigation link

## Summary

The Rewards Catalog is now fully functional! 🎉

**What works:**
- ✅ Kids can browse and redeem rewards
- ✅ Points are automatically deducted
- ✅ Parents can manage rewards and fulfill redemptions
- ✅ 25+ predefined reward templates available
- ✅ Full activity logging
- ✅ Category filtering
- ✅ Multi-user support

**Next Steps:**
1. Complete some chores to earn points
2. Visit `/rewards` to see the catalog
3. Try redeeming a reward
4. Go to Settings to manage rewards and fulfill redemptions

Enjoy your new rewards system! 🎁✨

