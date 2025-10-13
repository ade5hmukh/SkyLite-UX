# 🌟 Kids Chores Feature

A fun and engaging chore system for kids with colorful templates, points rewards, and celebration animations!

## ✨ Features

### 📋 Chore Templates
Pre-made chore templates with cute icons and descriptions:
- **Good Behavior**: Listening, being kind, saying please & thank you
- **Hygiene**: Brushing teeth, taking baths
- **Cleaning**: Making bed, cleaning room, putting toys away
- **Meal Time**: Setting table, eating vegetables, helping with dishes
- **Learning**: Homework, reading, practicing instruments
- **Pet Care**: Feeding pets
- **Other Chores**: Taking out trash, watering plants, helping with laundry

### 🎉 Celebration Animation
When kids complete a chore, they get:
- A gorgeous full-screen celebration animation
- Floating emojis (stars, sparkles, balloons)
- Points awarded message
- Fun bounce and wiggle animations

### ⭐ Points System
- Each chore awards points (usually 1-2 points)
- Points are tracked per user
- Points are displayed with a gold star badge on user profiles
- Auto-awards points when chores are marked complete

### 🎨 Visual Design
- Each chore has a unique colorful icon
- Category-based organization
- Kid-friendly interface
- Responsive grid layout for chore picker

## 🚀 How to Use

### For Parents/Admins:

1. **Set up user profiles** in Settings
   - Create a profile for each child
   - Assign a color and avatar
   - Each child gets their own todo column

2. **Add chores to a child's list**:
   - Click "Add new todo" for the child's column
   - In the todo dialog, there will be an option to browse chore templates
   - Or programmatically, call the chore picker dialog

3. **Track progress**:
   - View points on each user's profile in Settings
   - Points are shown with a ⭐ icon next to their name

### For Kids:

1. **View your chores** in your todo column
2. **Complete a chore** by clicking the checkbox
3. **Watch the celebration!** 🎉
4. **Earn points** and see your total in Settings!

## 🔧 Technical Implementation

### Database Schema Changes

```sql
-- Added to User model
points    Int      @default(0)

-- Added to Todo model
isChore     Boolean  @default(false)
choreType   String?
choreIcon   String?
points      Int      @default(0)
```

### New Components

- `app/components/chores/chorePickerDialog.vue` - Modal to select chore templates
- `app/components/chores/choreCelebration.vue` - Celebration animation
- `app/types/chores.ts` - Chore template definitions

### API Endpoints

- `GET /api/chores/templates` - Fetch all chore templates
- `POST /api/users/[id]/add-points` - Award points to a user

### Integration Points

- `app/pages/toDoLists.vue` - Main todo page with chore integration
- `app/pages/settings.vue` - Display user points

## 🎨 Customization

### Adding New Chore Templates

Edit `app/types/chores.ts` and add to the `choreTemplates` array:

```typescript
{
  id: "your-chore-id",
  title: "Chore Title",
  description: "What kids need to do",
  icon: "i-lucide-icon-name",
  category: "behavior|hygiene|cleaning|meal|learning|pet-care|chores",
  points: 1, // or 2 for harder chores
  color: "blue|purple|green|etc",
}
```

### Customizing the Celebration

Edit `app/components/chores/choreCelebration.vue` to change:
- Animation duration (default: 3 seconds)
- Colors and gradients
- Emoji selection
- Animation styles

### Adjusting Points

- Easy chores: 1 point
- Medium chores: 2 points
- Hard chores: Can go higher

## 🎯 Future Enhancements

Potential improvements:
- Rewards system (redeem points for treats/privileges)
- Leaderboards between siblings
- Daily/weekly chore streaks
- Photo proof for completed chores
- Custom chore creation
- Recurring daily chores
- Progress charts and statistics
- Parent approval before points are awarded
- Chore scheduling (morning vs evening chores)

## 🎭 Animation Details

The celebration animation includes:
- Bounce effect on the main card
- Spinning star icon
- Text wiggle animation
- 6 floating emojis with different trajectories
- Gradient background (yellow→orange→pink)
- Auto-dismiss after 3 seconds
- Smooth fade in/out transitions

## 🏆 Points Display

Points are shown:
- In the Settings page next to each user's name
- With a yellow/gold star icon ⭐
- Only if points > 0 (hidden for users with 0 points)
- Formatted in a pill-shaped badge

## 📝 Notes

- Chores are stored as regular todos with special fields (`isChore`, `choreIcon`, `choreType`, `points`)
- Points are only awarded when a chore is marked complete (not when unmarked)
- The celebration animation is non-blocking (users can dismiss by waiting or tapping outside if needed)
- All chore templates use Lucide icons which are already available in the project


