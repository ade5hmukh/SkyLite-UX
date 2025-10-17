<h3 align="center">Skylite UX - Enhanced Edition</h3>

<p align="center">
    The open-source family manager with gamification for kids
</p>

<p align="center">
<img src="https://github.com/user-attachments/assets/cf4b4b9f-c8db-4303-8fd0-58126a42382f" alt="SkyLite-UX"/>
</p>

[![Discord](https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/KJn3YfWxn7)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docs.docker.com/get-started/get-docker/)
[![NUXT](https://img.shields.io/badge/Nuxt-00DC82?style=for-the-badge&logo=nuxt&logoColor=white)](https://nuxt.com/docs/getting-started/introduction)
[![NUXT UI](https://img.shields.io/badge/NuxtUI-00DC82?style=for-the-badge&logo=nuxt&logoColor=white)](https://ui.nuxt.com)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/docs/installation/using-vite)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/docs)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/docs/)

# About This Fork

This is an enhanced fork of [Skylite-UX](https://github.com/Wetzel402/Skylite-UX) with extensive features designed specifically for families with young children (ages 4-6+). The focus is on gamification, parental controls, and making chores/tasks fun and rewarding for kids.

## ✨ Key Enhancements

### 🎮 **Gamification & Points System**
- **Points-Based Rewards**: Kids earn points for completing tasks and chores
- **Customizable Point Values**: Parents can assign different point values to different tasks
- **Real-Time Tracking**: Track points today, this week, and all-time
- **Points Leaderboard**: Competitive rankings with medals (🥇🥈🥉) to motivate kids

### 🎁 **Rewards Catalog**
- **45+ Pre-Built Rewards**: Screen time, treats, activities, privileges, toys, and special experiences
- **Customizable Rewards**: Parents can create, edit, and manage custom rewards
- **Point Redemption System**: Kids can "shop" for rewards using earned points
- **Redemption Management**: Parents approve/fulfill/cancel redemptions
- **Category Organization**: Rewards organized by type (screen time, treats, activities, etc.)

### ✅ **Enhanced Task Management**
- **Chore Templates**: 15+ age-appropriate chores for kids (make bed, brush teeth, set table, etc.)
- **Recurring Tasks**: Daily, weekly, and monthly recurring patterns
- **Skip & Snooze**: Flexible scheduling for holidays and special occasions
- **Multi-User Assignment**: Assign tasks to multiple kids at once
- **Priority Levels**: Low, Medium, High, Urgent task priorities
- **Visual Points Display**: See how many points each task is worth before completing it

### 🎉 **Celebration Animations**
- **Completion Celebrations**: Fun animations and confetti when kids complete tasks
- **Point Notifications**: Visual feedback showing points earned
- **Encouraging Messages**: Positive reinforcement for task completion

### 🔐 **Parental Controls**
- **Triple-Tap Admin Mode**: Tap the logo 3 times quickly to enable admin mode
- **PIN Protection**: 4-digit PIN (default: 1111) for accessing settings
- **Auto-Timeout**: Admin mode automatically deactivates after 10 minutes
- **Visual Indicators**: Green dot shows when admin mode is active
- **Restricted Pages**: Settings and management pages require admin access

### 📊 **Activity Logging**
- **Database-Backed Logging**: Comprehensive activity tracking
- **Filter by Service**: View logs for todos, chores, points, calendar, users, etc.
- **Filter by Level**: Info, Warning, Error log levels
- **User-Specific Logs**: See activity per user
- **Pagination**: Efficient browsing of large log histories

### 🎨 **User Customization**
- **Color-Coded Columns**: Each user's task list has their personalized color
- **Profile Avatars**: Custom avatars for each family member
- **Visual Identification**: Easy to see whose tasks are whose

### 📅 **Family Calendar Integration**
- **Event Management**: Create and manage family events
- **User-Specific Events**: Assign events to specific family members
- **Time Zone Support**: Configurable timezone (default: America/Chicago)
- **Real-Time Clock**: Live updating clock on all pages

### 🍽️ **Meal Planning**
- **Weekly Meal Planner**: Plan meals for the entire week
- **Recipe Management**: Store and organize family recipes
- **Ingredient Lists**: Track ingredients needed for meals

## Core Features

- **Docker Deployment**: Easy self-hosted deployment
- **Family Calendar**: Shared calendar for all family members
- **Task Lists**: Individual todo lists for each family member
- **Meal Planning**: Weekly meal planning and recipe management
- **User Management**: Multi-user support with profiles
- **Dark Mode**: Full dark mode support
- **Responsive Design**: Works on tablets, phones, and desktop
- **No Subscriptions**: Self-hosted, no ongoing costs
- **Privacy First**: Your data stays on your server

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for development)
- PostgreSQL 15+ (included in Docker setup)

### Installation

#### Using Docker (Recommended)

1. Clone this repository:
```bash
git clone https://github.com/yourusername/SkyLite-UX.git
cd SkyLite-UX
```

2. Create `.env` file:
```bash
DATABASE_URL="postgresql://skylite:password@db:5432/skylite"
NUXT_PUBLIC_TZ="America/Chicago"  # Set your timezone
NUXT_PUBLIC_LOG_LEVEL="info"
```

3. Start the application:
```bash
docker-compose up -d
```

4. Access the app at `http://localhost:3000`

#### Development Setup

1. Install dependencies:
```bash
npm install
```

2. Set up the database:
```bash
npx prisma migrate dev
npx prisma generate
```

3. Start the development server:
```bash
npm run dev
```

View the [original docs](https://wetzel402.github.io/Skylite-UX-docs/index.html#installation) for more detailed installation instructions.

## 🎯 Getting Started for Families

### Initial Setup
1. **Create User Profiles**: Add a profile for each family member with a name, avatar, and color
2. **Set Parental PIN**: Change the default PIN (1111) in `app/composables/useAdminMode.ts`
3. **Add Chores**: Use the chore templates or create custom tasks with point values
4. **Configure Rewards**: Set up rewards in the Settings page (requires admin mode)
5. **Enable Recurring Tasks**: Set daily/weekly chores to auto-reset

### For Parents
- **Triple-tap the logo** to activate admin mode (enters PIN if locked)
- **Settings Page** to manage users, rewards, chores, and view activity logs
- **Approve Redemptions** when kids redeem rewards
- **Track Progress** on the leaderboard page

### For Kids
- **Complete Tasks** to earn points (see celebration animations!)
- **Check Leaderboard** to see rankings and compete with siblings
- **Browse Rewards** catalog to see what you can earn
- **Redeem Rewards** when you have enough points

## 📱 Tablet-Friendly Design

This fork is optimized for shared family tablets:
- **No Login Required**: Perfect for shared devices
- **Large Touch Targets**: Easy for small hands
- **Parental Controls**: Triple-tap + PIN keeps settings secure
- **Visual Feedback**: Animations and colors make it engaging
- **Auto-Timeout**: Admin mode automatically locks after 10 minutes

## 🛠️ Technology Stack

- **Frontend**: Nuxt 3, Vue 3, TypeScript
- **UI Framework**: Nuxt UI (Tailwind CSS)
- **Backend**: Nuxt Server API, Nitro
- **Database**: PostgreSQL with Prisma ORM
- **Deployment**: Docker & Docker Compose
- **Logging**: Consola + Custom Activity Log System
- **Scheduling**: Node-cron for recurring tasks and point resets

## 📚 Documentation

This fork includes extensive documentation:
- `LEADERBOARD_CHANGES.md` - Points leaderboard feature
- `REWARDS_CATALOG_FEATURE.md` - Rewards system documentation
- `TESTING_RECURRING_TASKS.md` - Recurring tasks guide
- `POINTS_DISPLAY_FEATURE.md` - Points display implementation
- `NEW_CHORES_4-6.md` - Chores for young children
- `DAILY_WEEKLY_REWARDS_GUIDE.md` - Reward suggestions
- `PERFORMANCE_STATUS.md` - Performance optimization guide

## 🧪 Testing

The repository includes test scripts for various features:
- `test-recurring-tasks.sh` - Test recurring task functionality
- `test-rewards.sh` - Test rewards and redemption system
- `verify-database.sql` - Database verification queries

Run tests:
```bash
chmod +x test-recurring-tasks.sh test-rewards.sh
./test-recurring-tasks.sh
./test-rewards.sh
```

## 🔧 Configuration

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `NUXT_PUBLIC_TZ` - Timezone (default: America/Chicago)
- `NUXT_PUBLIC_LOG_LEVEL` - Logging level (verbose, info, warn, error)

### Customization
- **Change PIN**: Edit `app/composables/useAdminMode.ts`
- **Add Chore Templates**: Edit `app/types/chores.ts`
- **Add Reward Templates**: Edit `app/types/rewards.ts`
- **Adjust Point Values**: Modify in Settings or template files

## 🆚 What's Different from Original Skylite-UX?

This fork adds significant functionality focused on kids and gamification:

| Feature | Original | This Fork |
|---------|----------|-----------|
| **Points System** | ❌ None | ✅ Full points tracking (daily/weekly/all-time) |
| **Rewards Catalog** | ❌ None | ✅ 45+ rewards with redemption system |
| **Parental Controls** | ❌ None | ✅ Triple-tap + PIN protection |
| **Recurring Tasks** | ✅ Basic | ✅ Advanced (weekly/monthly, skip/snooze) |
| **Chore Templates** | ❌ None | ✅ 15+ age-appropriate chores |
| **Celebration Animations** | ❌ None | ✅ Fun animations on completion |
| **Activity Logging** | ❌ None | ✅ Database-backed logging system |
| **Points Leaderboard** | ❌ None | ✅ Competitive rankings with medals |
| **Visual Points Display** | ❌ None | ✅ See points on each task |
| **Multi-User Assignment** | ❌ None | ✅ Assign tasks to multiple users |
| **Shopping Lists** | ✅ Yes | ❌ Replaced with Leaderboard |
| **User Color Themes** | ❌ None | ✅ Color-coded task columns |

## 🎨 Screenshots

*Coming soon - screenshots of the leaderboard, rewards catalog, and task management*

## 🗺️ Roadmap

Potential future enhancements:
- [ ] Mobile app (React Native or PWA)
- [ ] Voice assistant integration for task completion
- [ ] Photo uploads for completed chores
- [ ] Weekly/monthly reports for parents
- [ ] Integration with smart home devices
- [ ] Achievement badges and milestones
- [ ] Family goals and collaborative tasks
- [ ] Export data for external analysis

## ⚠️ Known Issues

- Shopping lists feature removed in favor of leaderboard (can be re-enabled if needed)
- Default PIN is 1111 (should be changed in production)
- Admin mode timeout is fixed at 10 minutes (not configurable via UI)
- Rewards catalog loads all rewards at once (may need pagination for 100+ rewards)

## 🙏 Acknowledgments

- **Original Skylite-UX**: [Wetzel402/Skylite-UX](https://github.com/Wetzel402/Skylite-UX)
- **OriginUI**: Calendar UI components adapted with permission
- **Nuxt Team**: Amazing framework and ecosystem
- **Prisma**: Excellent ORM for TypeScript

## 🤝 Contributing

This is a personal fork with family-focused enhancements. Feel free to:
- Fork this repository for your own family's needs
- Submit issues for bugs or feature requests
- Create pull requests for improvements

For contributing to the original project, check out the [contributor guide](https://wetzel402.github.io/Skylite-UX-docs/CONTRIBUTING.html).

## 📧 Support

For issues specific to this fork, please open a GitHub issue. For questions about the original Skylite-UX, visit their [Discord](https://discord.gg/KJn3YfWxn7).

## Development

Read our [development guide](https://wetzel402.github.io/Skylite-UX-docs/DEVELOPMENT.html) for more details on the original architecture.

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Special Thanks

The calendar UI was rewritten from [OriginUI](https://github.com/origin-space/ui-experiments) React code with express permission. Thank you Pasquale and Davide!
