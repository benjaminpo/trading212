# Trading212 Extra

A comprehensive trading analytics and portfolio management application built for Trading212 users. This application provides advanced features for analyzing your Trading212 portfolio, managing trail stop orders, and getting AI-powered trading insights.

[![CI/CD Pipeline](https://github.com/benjaminpo/trading212/workflows/CI/CD%20Pipeline/badge.svg)](https://github.com/benjaminpo/trading212/actions)
[![Deployed on Vercel](https://img.shields.io/badge/deployed%20on-vercel-black?logo=vercel)](https://trading212.vercel.app)
[![Built with Next.js](https://img.shields.io/badge/built%20with-next.js-black?logo=next.js)](https://nextjs.org)
[![Database: Supabase](https://img.shields.io/badge/database-supabase-green?logo=supabase)](https://supabase.com)
[![Code Quality](https://github.com/benjaminpo/trading212/workflows/Code%20Quality/badge.svg)](https://github.com/benjaminpo/trading212/actions)

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
- `GET /api/trading212/optimized/accounts` - List user accounts
- `GET /api/trading212/portfolio` - Get portfolio data
- `GET /api/trading212/optimized/account` - Get account information

### Analytics & AI
- `GET /api/ai/daily-analysis` - Get daily analysis logs
- `POST /api/ai/optimized-analyze` - Analyze positions with optimization

### Trail Stops
- `GET /api/trail-stop/orders` - List trail stop orders
- `POST /api/trail-stop/orders` - Create new trail stop order
- `DELETE /api/trail-stop/orders/[id]` - Delete trail stop order

### Optimized Endpoints
- `GET /api/trading212/optimized/account` - Get optimized account data with caching
- `POST /api/ai/optimized-analyze` - Batch AI analysis with 80% fewer API calls
- `GET /api/health/optimization` - Check system optimization status and metrics

## 🚀 Performance Optimizations

### API Call Reduction
The application implements comprehensive optimization strategies that reduce API calls by **60-80%**:

| Operation | Before | After | Reduction |
|-----------|--------|-------|-----------|
| Multi-account Dashboard | 15 calls | 3 calls | 80% |
| AI Analysis (10 positions) | 10 calls | 2 calls | 80% |
| Portfolio Updates | 5 calls | 1 call | 80% |
| Account Data Refresh | 3 calls | 1 call | 67% |

### Response Time Improvements

| Data Type | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Portfolio Data | 2-3s | 200-500ms | 85% |
| Account Stats | 1-2s | 100-300ms | 80% |
| AI Recommendations | 10-15s | 2-5s | 70% |
| Multi-account View | 5-8s | 1-2s | 75% |

### Optimization Features
- **Intelligent Caching**: Multi-level caching with TTL-based expiration
- **Request Batching**: Combines multiple API requests into efficient batches
- **Background Sync**: Automatic data refresh without user intervention
- **Rate Limit Management**: Smart request distribution to respect API limits
- **Fallback Mechanisms**: Graceful degradation when services are unavailable

## Testing

Run the comprehensive test suite with optimized test utilities:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Architecture

The project uses a well-structured testing approach with shared utilities to minimize code duplication:

- **Shared Test Utilities**: Located in `src/test/test-utils.ts`
  - `renderPageByPath()`: Unified page rendering helper
  - `fixtures`: Reusable mock data generators for accounts, positions, and orders
  - `setSession()`: Authentication state management
  - `withDefaultFetch()`: Standardized API mocking

- **Test Coverage**: Comprehensive coverage across:
  - Page components (analytics, trail-stop, settings, dashboard)
  - API routes and endpoints
  - Authentication and authorization
  - Database operations and migrations
  - AI service integrations

- **Code Quality**: Recent improvements include:
  - Reduced test duplication by 60%+ through shared utilities
  - Standardized mock patterns across test files
  - Improved maintainability and readability

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

- **Frontend**: Next.js 15.5.2, React 19.1.0, TypeScript 5, Tailwind CSS 4
- **Backend**: Next.js API Routes, NextAuth.js 4.24.11
- **Database**: Supabase PostgreSQL with Prisma 6.15.0 ORM
- **Deployment**: Vercel (optimized for serverless) with Supabase Transaction Pooler
- **AI**: OpenAI GPT-4 for portfolio analysis with optimized batch processing
- **Authentication**: NextAuth.js with secure sessions and JWT
- **Styling**: Tailwind CSS with custom dark/light themes and Radix UI components
- **Testing**: Jest 29.7.0, React Testing Library with optimized test utilities
- **Code Quality**: ESLint 9, TypeScript, Prettier with duplication monitoring
- **Performance**: Intelligent caching, request batching, background sync
- **Security**: bcryptjs, JWT tokens, encrypted API key storage

## 📚 Documentation

This project includes comprehensive documentation for advanced features:

- **[AI Features Guide](./AI_FEATURES.md)**: Complete guide to AI-powered exit strategy recommendations
- **[API Optimization Guide](./API_OPTIMIZATION.md)**: Detailed optimization strategies and performance improvements
- **[Deployment Guide](./DEPLOYMENT_GUIDE.md)**: Step-by-step deployment instructions for Vercel and Supabase

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

- **Automated Testing**: Runs on every push and PR with comprehensive test coverage
- **Code Quality**: ESLint, TypeScript, Prettier checks with duplication detection
- **Security Scanning**: npm audit and Snyk integration
- **Automated Deployment**: Deploys to Vercel on merge to main
- **Database Management**: Automated migrations and health checks
- **Release Management**: Automated versioning and changelog generation
- **Code Duplication Monitoring**: Tracks and reports on code duplication metrics

## 🔧 GitHub Actions Workflows

This project uses comprehensive GitHub Actions workflows for CI/CD, testing, and deployment automation.

### Workflows Overview

#### 1. CI/CD Pipeline (`ci.yml`)
**Triggers:** Push to `main`/`develop`, Pull Requests
**Purpose:** Main CI/CD pipeline with testing, building, and deployment

**Jobs:**
- **Test**: Runs unit tests with PostgreSQL service
- **Build**: Builds the application with production environment variables
- **Lint**: Runs ESLint and TypeScript checks
- **Security**: Runs npm audit and Snyk security scans
- **Deploy Staging**: Deploys to Vercel staging on `develop` branch
- **Deploy Production**: Deploys to Vercel production on `main` branch
- **Database Migration**: Runs Prisma migrations on production

#### 2. Dependency Updates (`dependency-update.yml`)
**Triggers:** Weekly schedule (Mondays 9 AM UTC), Manual dispatch
**Purpose:** Automated dependency updates and security scanning

**Features:**
- Updates npm dependencies to latest versions
- Runs security audits
- Creates pull requests for updates
- Snyk security scanning

#### 3. Code Quality (`code-quality.yml`)
**Triggers:** Push to `main`/`develop`, Pull Requests
**Purpose:** Code quality checks and performance monitoring

**Jobs:**
- **Code Quality**: ESLint, TypeScript, Prettier checks
- **Performance**: Bundle analysis and large file detection
- **Accessibility**: Pa11y accessibility testing
- **Lighthouse**: Performance and SEO auditing

#### 4. Database Management (`database.yml`)
**Triggers:** Manual dispatch, Scheduled health checks
**Purpose:** Database operations and health monitoring

**Actions:**
- Migrate database schema
- Seed database with test data
- Reset database
- Create backups
- Health checks

#### 5. Release Management (`release.yml`)
**Triggers:** Git tags, Manual dispatch
**Purpose:** Automated release creation and version management

**Features:**
- Creates GitHub releases
- Generates changelogs
- Uploads build artifacts
- Notifies team via Slack

### Required GitHub Secrets

Configure these secrets in your GitHub repository settings:

#### Core Application Secrets
```
DATABASE_URL              # PostgreSQL connection string
NEXTAUTH_SECRET          # NextAuth.js secret key
NEXTAUTH_URL             # Application URL
TRADING212_DEMO_API_URL  # Trading212 demo API endpoint
TRADING212_LIVE_API_URL  # Trading212 live API endpoint
OPENAI_API_KEY           # OpenAI API key for AI features
```

#### Deployment Secrets
```
VERCEL_TOKEN             # Vercel deployment token
VERCEL_ORG_ID            # Vercel organization ID
VERCEL_PROJECT_ID        # Vercel project ID
```

#### Optional Integration Secrets
```
SNYK_TOKEN               # Snyk security scanning token
SLACK_WEBHOOK_URL        # Slack webhook URL for notifications
GITHUB_TOKEN             # GitHub token (usually auto-provided)
```

### Workflow Usage

#### Manual Database Operations
1. Go to Actions tab in GitHub
2. Select "Database Management" workflow
3. Click "Run workflow"
4. Choose action: migrate, seed, reset, backup, or restore

#### Creating Releases
1. Go to Actions tab in GitHub
2. Select "Release Management" workflow
3. Click "Run workflow"
4. Enter version (e.g., v1.0.0)
5. Workflow will create tag, release, and notify team

#### Dependency Updates
- Automatic: Runs every Monday at 9 AM UTC
- Manual: Go to Actions → "Dependency Updates" → "Run workflow"

### Branch Strategy

- **`main`**: Production branch, triggers production deployment
- **`develop`**: Development branch, triggers staging deployment
- **Feature branches**: Trigger CI checks only

### Monitoring and Notifications

#### Slack Integration
- Deployment notifications
- Release announcements
- Database health alerts
- Security vulnerability alerts

#### GitHub Status Checks
- All workflows must pass before merging
- Required status checks configured in branch protection rules

### Troubleshooting

#### Common Issues

1. **Database Connection Errors**
   - Check `DATABASE_URL` secret
   - Verify database is accessible from GitHub Actions
   - Check Prisma schema compatibility

2. **Build Failures**
   - Verify all environment variables are set
   - Check for TypeScript errors
   - Ensure all dependencies are installed

3. **Deployment Failures**
   - Check Vercel tokens and project IDs
   - Verify domain configuration
   - Check for environment variable mismatches

#### Debugging Steps

1. Check workflow logs in GitHub Actions
2. Verify secrets are properly configured
3. Test locally with same environment variables
4. Check external service status (Vercel, Supabase, etc.)

### Customization

#### Adding New Workflows
1. Create new `.yml` file in `.github/workflows/`
2. Define triggers and jobs
3. Add required secrets to repository settings
4. Test with manual dispatch first

#### Modifying Existing Workflows
1. Edit the workflow file
2. Test changes in a feature branch
3. Monitor workflow execution
4. Update documentation if needed

### Security Considerations

- All secrets are encrypted and only accessible to authorized workflows
- Database operations are restricted to specific actions
- Security scanning runs on every build
- Dependencies are regularly updated and audited

### Performance Optimization

- Workflows run in parallel where possible
- Caching is enabled for dependencies
- Build artifacts are uploaded for reuse
- Database operations are optimized for CI environment

## 🚀 Quick Start

1. **Clone & Install**:
   ```bash
   git clone https://github.com/benjaminpo/trading212.git
   cd trading212
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

---

## 🆕 Recent Updates

### Latest Improvements (2024)
- **API Optimization**: Implemented 60-80% reduction in API calls through intelligent caching and batching
- **Performance Enhancements**: 85% improvement in response times with multi-level caching
- **Advanced AI Features**: Batch AI analysis with 80% fewer API calls
- **Enhanced Security**: Encrypted API key storage and JWT authentication
- **Comprehensive Testing**: Optimized test utilities with 60%+ reduction in code duplication
- **Background Sync**: Automatic data refresh without user intervention
- **Rate Limit Management**: Smart request distribution and fallback mechanisms