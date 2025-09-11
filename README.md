# Trading212 Extra

A comprehensive trading analytics and portfolio management application built for Trading212 users. This application provides advanced features for analyzing your Trading212 portfolio, managing trail stop orders, and getting AI-powered trading insights.

[![CI/CD Pipeline](https://github.com/your-username/trading212-advance-trade/workflows/CI/CD%20Pipeline/badge.svg)](https://github.com/your-username/trading212-advance-trade/actions)
[![Deployed on Vercel](https://img.shields.io/badge/deployed%20on-vercel-black?logo=vercel)](https://trading212.vercel.app)
[![Built with Next.js](https://img.shields.io/badge/built%20with-next.js-black?logo=next.js)](https://nextjs.org)
[![Database: Supabase](https://img.shields.io/badge/database-supabase-green?logo=supabase)](https://supabase.com)
[![Code Quality](https://github.com/your-username/trading212-advance-trade/workflows/Code%20Quality/badge.svg)](https://github.com/your-username/trading212-advance-trade/actions)

## Features

### 📊 Portfolio Analytics
- **Real-time Portfolio Tracking**: Connect multiple Trading212 accounts (both practice and live)
- **P/L Analysis**: Detailed profit/loss analysis with percentage calculations
- **Top/Worst Performers**: Identify your best and worst performing positions
- **Multi-Account Support**: Manage and analyze multiple Trading212 accounts simultaneously

### 🤖 AI-Powered Insights
- **Daily Analysis**: Automated daily portfolio analysis and recommendations
- **Position Analysis**: AI-powered insights on individual positions
- **Risk Assessment**: Personalized risk analysis based on your portfolio

### 🛡️ Risk Management
- **Trail Stop Orders**: Set up automated trail stop loss orders
- **Notifications**: Get notified when trail stops are triggered
- **Account Monitoring**: Monitor multiple accounts with centralized dashboard

### 🎨 Modern UI/UX
- **Dark/Light Mode**: Beautiful theme switching
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Real-time Updates**: Live data updates with rate limiting protection

## Getting Started

### Prerequisites
- Node.js 18+ 
- Trading212 account with API access enabled
- Supabase account (for database)
- OpenAI API key (for AI features)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/benjaminpo/trading212.git
cd trading212
```

2. Install dependencies:
```bash
npm install
```

3. Set up Supabase database:
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to Settings > Database and copy your connection string
   - Use the **Transaction Pooler** connection for best performance

4. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your configuration:
```env
# Supabase Database (Transaction Pooler - Recommended)
DATABASE_URL="postgresql://postgres.your-project:your-password@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_nextauth_secret_here"

# Trading212 API URLs
TRADING212_DEMO_API_URL="https://demo.trading212.com/api/v0"
TRADING212_LIVE_API_URL="https://live.trading212.com/api/v0"

# OpenAI (for AI features)
OPENAI_API_KEY="your_openai_api_key"
```

5. Set up the database:
```bash
# Generate Prisma client
npx prisma generate

# The database schema is already set up in Supabase
# No migration needed for initial setup
```

6. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Usage

### Connecting Trading212 Accounts

1. **Get API Key**: Log into your Trading212 account and generate an API key
2. **Add Account**: Go to Settings and add your Trading212 account
3. **Verify Connection**: The app will test both live and demo modes automatically

### Multi-Account Management

- Add multiple Trading212 accounts (practice and live)
- Set default accounts for quick access
- View aggregated data across all accounts
- Individual account analysis and management

### Trail Stop Orders

- Set up trail stop orders for your positions
- Monitor trail stops from the dedicated page
- Receive notifications when stops are triggered
- Manual execution required for live accounts (API limitation)

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/signin` - User sign in
- `GET /api/auth/session` - Get current session

### Trading212 Integration
- `POST /api/trading212/connect` - Connect Trading212 account
- `DELETE /api/trading212/connect` - Disconnect account
- `GET /api/trading212/accounts` - List user accounts
- `GET /api/trading212/portfolio` - Get portfolio data
- `GET /api/trading212/account` - Get account information

### Analytics & AI
- `GET /api/ai/daily-analysis` - Get daily analysis logs
- `POST /api/ai/analyze-positions` - Analyze specific positions

### Trail Stops
- `GET /api/trail-stop/orders` - List trail stop orders
- `POST /api/trail-stop/orders` - Create new trail stop order
- `DELETE /api/trail-stop/orders/[id]` - Delete trail stop order

## Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Deployment

### 🚀 Vercel Deployment (Recommended)

The application is optimized for deployment on Vercel with Supabase as the database.

#### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/benjaminpo/trading212)

#### Manual Deployment

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "New Project"
   - Import your repository
   - **Name the project `trading212`** (to get trading212.vercel.app domain)

3. **Set Environment Variables:**
   ```env
   DATABASE_URL="postgresql://postgres.your-project:your-password@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"
   NEXTAUTH_URL="https://trading212.vercel.app"
   NEXTAUTH_SECRET="your_generated_secret"
   TRADING212_DEMO_API_URL="https://demo.trading212.com/api/v0"
   TRADING212_LIVE_API_URL="https://live.trading212.com/api/v0"
   OPENAI_API_KEY="your_openai_api_key"
   ```

4. **Generate NEXTAUTH_SECRET:**
   ```bash
   openssl rand -base64 32
   ```

5. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at `https://trading212.vercel.app`

### 🗄️ Database Setup

The application uses **Supabase PostgreSQL** with the following optimizations:
- **Transaction Pooler** connection (recommended for Vercel)
- Pre-configured schema with all required tables
- Automatic connection pooling for serverless functions

### 📊 Performance Features

- **Rate Limiting**: Built-in protection against API rate limits
- **Connection Pooling**: Optimized database connections
- **Static Generation**: Pre-rendered pages for better performance
- **Edge Functions**: Serverless API routes for global performance

### Other Platforms

The application can also be deployed to:
- **Railway** (with Supabase)
- **Render** (with Supabase)
- **AWS Amplify** (with RDS PostgreSQL)
- **DigitalOcean App Platform** (with Managed PostgreSQL)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This application is for educational and informational purposes only. Trading involves risk, and you should never invest more than you can afford to lose. The authors are not responsible for any financial losses incurred through the use of this application.

## Support

For support, please open an issue on GitHub or contact the development team.

---

## 🏗️ Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, NextAuth.js
- **Database**: Supabase PostgreSQL with Prisma ORM
- **Deployment**: Vercel (optimized for serverless)
- **AI**: OpenAI GPT-4 for portfolio analysis
- **Authentication**: NextAuth.js with secure sessions
- **Styling**: Tailwind CSS with custom dark/light themes

## 📈 Live Demo

🎯 **Live Application**: [https://trading212.vercel.app](https://trading212.vercel.app)

## 🔧 Development & CI/CD

### Local CI Testing
Run the same checks as GitHub Actions locally:

```bash
# Run all CI checks
npm run ci:local

# Run specific checks
npm run ci:test      # Run tests
npm run ci:build     # Build application
npm run ci:lint      # Run linting
npm run ci:security  # Run security audit
```

### CI/CD Pipeline
This project uses GitHub Actions for automated CI/CD:

- **Automated Testing**: Runs on every push and PR
- **Code Quality**: ESLint, TypeScript, Prettier checks
- **Security Scanning**: npm audit and Snyk integration
- **Automated Deployment**: Deploys to Vercel on merge to main
- **Database Management**: Automated migrations and health checks
- **Release Management**: Automated versioning and changelog generation

See [`.github/README.md`](.github/README.md) for detailed workflow documentation.

## 🚀 Quick Start

1. **Clone & Install**:
   ```bash
   git clone https://github.com/benjaminpo/trading212.git
   cd trading212-extra
   npm install
   ```

2. **Set up Supabase**:
   - Create project at [supabase.com](https://supabase.com)
   - Copy Transaction Pooler connection string

3. **Configure Environment**:
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your credentials
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

---

Built with ❤️ using Next.js, TypeScript, Supabase, and Vercel.