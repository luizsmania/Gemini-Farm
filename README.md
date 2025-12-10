# 🌾 Gemini Farm Tycoon

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-19.2.1-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)
![Vercel](https://img.shields.io/badge/deployed%20on-Vercel-black?logo=vercel)

**🎮 Play the game live:** [https://gemini-farm-umber.vercel.app/](https://gemini-farm-umber.vercel.app/)

*A modern, feature-rich farming tycoon game with real-time multiplayer sync, AI-powered quests, and endless progression!*

</div>

---

## 🎯 Overview

**Gemini Farm Tycoon** is an immersive farming simulation game where you build and manage your own agricultural empire. Plant crops, process them into products, complete missions, unlock achievements, and expand your farm across multiple devices with real-time synchronization.

### ✨ Key Features

- 🌱 **6 Unique Crops** - From wheat to the mystical Gemini Fruit
- 🏭 **Processing Buildings** - Windmills, Bakeries, and more to create valuable products
- 🎯 **Mission System** - Complete quests to earn rewards and unlock new content
- 🏆 **Achievements** - Track your progress with dozens of achievements
- 🌦️ **Dynamic Weather** - Sunny, rainy, and drought conditions affect your farm
- 🍂 **Seasonal System** - Spring, Summer, Autumn, and Winter with seasonal bonuses
- 💰 **Market Trends** - AI-powered market analysis for optimal selling times
- 🔄 **Real-Time Sync** - Play on multiple devices with instant synchronization via WebSocket
- 📱 **Mobile Optimized** - Beautiful, responsive design for mobile and desktop
- 🎨 **Customization** - Decorate your farm with various decorations
- ⚡ **Prestige System** - Reset and gain permanent bonuses
- 🌟 **Crop Mastery** - Level up individual crops for bonus rewards
- 🤖 **AI Merchant** - Negotiate trades with an AI-powered merchant

---

## 🎮 Game Systems

### 🌾 Farming System

- **6 Crops**: Wheat 🌾, Corn 🌽, Carrot 🥕, Tomato 🍅, Pumpkin 🎃, Gemini Fruit ✨
- **Growth Times**: From 3 seconds (Wheat) to 2 minutes (Gemini Fruit)
- **Season Affinity**: Each crop grows better in specific seasons
- **Watering System**: Water crops manually or use sprinklers for automation
- **Drag to Plant**: Click and drag to plant/harvest/water multiple plots at once

### 🏭 Production System

- **6 Processing Buildings**: Windmill, Bakery, Popcorn Machine, Ketchup Factory, Pie Oven, Star Jam Maker
- **Recipe System**: Combine crops to create valuable products
- **Processing Time**: Each product takes time to process
- **Profit Multiplier**: Processed products sell for significantly more than raw crops

### 💰 Economy System

- **Dynamic Pricing**: Market trends affect crop prices
- **AI Market Analyst**: Get predictions on which crops will be "hot" next
- **Combo System**: Chain harvests for bonus multipliers
- **Prestige Points**: Earn permanent bonuses through prestige resets

### 🎯 Progression Systems

#### Missions
- **Tiered Missions**: Complete missions to unlock the next tier
- **Mission Types**: Harvest, Sell, Level Up, Build, Earn, Collect
- **Rewards**: Coins and XP for completing missions

#### Achievements
- **Unlockable Achievements**: Complete various milestones
- **Categories**: Harvesting, Building, Earning, Leveling, and more
- **Permanent Tracking**: Your achievements are saved permanently

#### Daily Challenges
- **Daily Reset**: New challenge every 24 hours
- **Bonus Multiplier**: Complete challenges for temporary bonuses
- **Progress Tracking**: Visual progress bars for all challenges

### 🌟 Advanced Features

#### Prestige System
- **Reset at Level 20+**: Prestige to gain permanent bonuses
- **Prestige Points**: Spend points on permanent upgrades
- **Multiplier Stacking**: Each prestige level adds more power

#### Crop Mastery
- **Individual Crop Levels**: Level up each crop type separately
- **Mastery Bonuses**: Higher mastery = better yields and XP
- **Visual Indicators**: See mastery levels for each crop

#### Research Tree
- **6 Research Nodes**: Unlock powerful upgrades
- **Categories**: Efficiency, Automation, Mastery, Prestige
- **Prestige Points Cost**: Spend prestige points to unlock research

---

## 🛠️ Technology Stack

### Frontend
- **React 19.2.1** - Modern UI framework
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Vite** - Fast build tool
- **Lucide React** - Beautiful icons

### Backend
- **Vercel Serverless Functions** - API endpoints
- **PostgreSQL** (Vercel Postgres) - User data and game state storage
- **WebSocket Server** (Railway) - Real-time synchronization
- **Socket.io** - WebSocket communication

### AI Integration
- **Google Gemini API** - AI-powered market trends and quest generation
- **Dynamic Quest System** - AI generates unique quests based on player level
- **Market Analysis** - AI predicts market trends

### Deployment
- **Vercel** - Frontend and API hosting
- **Railway** - WebSocket server hosting

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Vercel account (for deployment)
- Railway account (for WebSocket server)
- Google Gemini API key (for AI features)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/gemini-farm-tycoon.git
cd gemini-farm-tycoon

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Run development server
npm run dev
```

### Environment Variables

```env
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_WS_URL=your_websocket_server_url
POSTGRES_URL=your_postgres_connection_string
```

---

## 🎨 Game Screenshots

### Main Farm View
```
🌾 Plant crops on your 6x6 grid farm
💧 Water crops manually or use sprinklers
🏭 Build processing buildings to create products
🎨 Decorate with various decorations
```

### Shop & Market
```
🛒 Buy seeds, buildings, and decorations
📈 View market trends and AI predictions
💰 Sell crops and products at optimal prices
```

### Missions & Achievements
```
🎯 Complete tiered missions for rewards
🏆 Unlock achievements as you progress
📅 Complete daily challenges for bonuses
```

---

## 🎮 How to Play

1. **Create Account** - Register with a username and password
2. **Start Farming** - Plant your first wheat seeds
3. **Harvest & Sell** - Harvest crops and sell them for coins
4. **Expand** - Buy more plots and unlock new crops
5. **Build** - Construct processing buildings to create products
6. **Complete Missions** - Finish missions to unlock new content
7. **Level Up** - Gain XP to unlock new crops and buildings
8. **Prestige** - Reset at level 20+ for permanent bonuses
9. **Master Crops** - Level up individual crops for better yields
10. **Sync Across Devices** - Play on multiple devices with real-time sync!

---

## 🌐 Multi-Device Sync

The game features **real-time synchronization** across all your devices:

- ✅ **Instant Updates** - Changes sync immediately via WebSocket
- ✅ **Conflict Resolution** - Version tracking prevents data loss
- ✅ **Offline Support** - Play offline, sync when online
- ✅ **Secure Storage** - All data stored in PostgreSQL database

---

## 📱 Mobile Experience

- **Touch-Optimized** - Drag to plant/harvest/water multiple plots
- **Responsive Design** - Beautiful UI on all screen sizes
- **PWA Support** - Install as an app on your device
- **Fast Performance** - Optimized for mobile devices

---

## 🔐 Security Features

- **Password Hashing** - SHA-256 with salt
- **Session Management** - Secure authentication
- **SQL Injection Protection** - Parameterized queries
- **XSS Protection** - Input sanitization

---

## 🎯 Roadmap

- [ ] More crop varieties
- [ ] Additional processing buildings
- [ ] Multiplayer features
- [ ] Leaderboards
- [ ] More decorations
- [ ] Advanced weather effects
- [ ] Trading system between players

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- **Google Gemini** - For AI-powered quest and market trend generation
- **Vercel** - For hosting and serverless functions
- **Railway** - For WebSocket server hosting
- **React & TypeScript** - For the amazing development experience

---

## 📞 Support

If you encounter any issues or have questions:

- 🐛 **Report Bugs**: Open an issue on GitHub
- 💡 **Suggest Features**: Submit a feature request
- 📧 **Contact**: Reach out via GitHub issues

---

<div align="center">

**Made with ❤️ using React, TypeScript, and AI**

[🎮 Play Now](https://gemini-farm-umber.vercel.app/) | [📖 Documentation](#) | [🐛 Report Bug](#)

</div>
