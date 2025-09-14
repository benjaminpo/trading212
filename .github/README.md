# GitHub Actions Workflows

This directory contains GitHub Actions workflows for CI/CD, testing, and deployment automation.

## Workflows Overview

### 1. CI/CD Pipeline (`ci.yml`)
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

### 2. Dependency Updates (`dependency-update.yml`)
**Triggers:** Weekly schedule (Mondays 9 AM UTC), Manual dispatch
**Purpose:** Automated dependency updates and security scanning

**Features:**
- Updates npm dependencies to latest versions
- Runs security audits
- Creates pull requests for updates
- Snyk security scanning

### 3. Code Quality (`code-quality.yml`)
**Triggers:** Push to `main`/`develop`, Pull Requests
**Purpose:** Code quality checks and performance monitoring

**Jobs:**
- **Code Quality**: ESLint, TypeScript, Prettier checks
- **Performance**: Bundle analysis and large file detection
- **Accessibility**: Pa11y accessibility testing
- **Lighthouse**: Performance and SEO auditing

### 4. Database Management (`database.yml`)
**Triggers:** Manual dispatch, Scheduled health checks
**Purpose:** Database operations and health monitoring

**Actions:**
- Migrate database schema
- Seed database with test data
- Reset database
- Create backups
- Health checks

### 5. Release Management (`release.yml`)
**Triggers:** Git tags, Manual dispatch
**Purpose:** Automated release creation and version management

**Features:**
- Creates GitHub releases
- Generates changelogs
- Uploads build artifacts
- Notifies team via Slack

## Required Secrets

Configure these secrets in your GitHub repository settings:

### Core Application Secrets
```
DATABASE_URL              # PostgreSQL connection string
NEXTAUTH_SECRET          # NextAuth.js secret key
NEXTAUTH_URL             # Application URL
TRADING212_DEMO_API_URL  # Trading212 demo API endpoint
TRADING212_LIVE_API_URL  # Trading212 live API endpoint
OPENAI_API_KEY           # OpenAI API key for AI features
```

### Deployment Secrets
```
VERCEL_TOKEN             # Vercel deployment token
VERCEL_ORG_ID            # Vercel organization ID
VERCEL_PROJECT_ID        # Vercel project ID
```

### Optional Integration Secrets
```
SNYK_TOKEN               # Snyk security scanning token
SLACK_WEBHOOK_URL        # Slack webhook URL for notifications
GITHUB_TOKEN             # GitHub token (usually auto-provided)
```

## Environment Variables

### Development
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/trading212_dev
NEXTAUTH_SECRET=your-development-secret
NEXTAUTH_URL=http://localhost:3000
TRADING212_DEMO_API_URL=https://demo.trading212.com/api/v1
TRADING212_LIVE_API_URL=https://live.trading212.com/api/v1
OPENAI_API_KEY=your-openai-api-key
```

### Production
```bash
DATABASE_URL=postgresql://user:password@host:port/database
NEXTAUTH_SECRET=your-production-secret
NEXTAUTH_URL=https://your-domain.com
TRADING212_DEMO_API_URL=https://demo.trading212.com/api/v1
TRADING212_LIVE_API_URL=https://live.trading212.com/api/v1
OPENAI_API_KEY=your-openai-api-key
```

## Workflow Usage

### Manual Database Operations
1. Go to Actions tab in GitHub
2. Select "Database Management" workflow
3. Click "Run workflow"
4. Choose action: migrate, seed, reset, backup, or restore

### Creating Releases
1. Go to Actions tab in GitHub
2. Select "Release Management" workflow
3. Click "Run workflow"
4. Enter version (e.g., v1.0.0)
5. Workflow will create tag, release, and notify team

### Dependency Updates
- Automatic: Runs every Monday at 9 AM UTC
- Manual: Go to Actions → "Dependency Updates" → "Run workflow"

## Branch Strategy

- **`main`**: Production branch, triggers production deployment
- **`develop`**: Development branch, triggers staging deployment
- **Feature branches**: Trigger CI checks only

## Monitoring and Notifications

### Slack Integration
- Deployment notifications
- Release announcements
- Database health alerts
- Security vulnerability alerts

### GitHub Status Checks
- All workflows must pass before merging
- Required status checks configured in branch protection rules

## Troubleshooting

### Common Issues

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

### Debugging Steps

1. Check workflow logs in GitHub Actions
2. Verify secrets are properly configured
3. Test locally with same environment variables
4. Check external service status (Vercel, Supabase, etc.)

## Customization

### Adding New Workflows
1. Create new `.yml` file in `.github/workflows/`
2. Define triggers and jobs
3. Add required secrets to repository settings
4. Test with manual dispatch first

### Modifying Existing Workflows
1. Edit the workflow file
2. Test changes in a feature branch
3. Monitor workflow execution
4. Update documentation if needed

## Security Considerations

- All secrets are encrypted and only accessible to authorized workflows
- Database operations are restricted to specific actions
- Security scanning runs on every build
- Dependencies are regularly updated and audited

## Performance Optimization

- Workflows run in parallel where possible
- Caching is enabled for dependencies
- Build artifacts are uploaded for reuse
- Database operations are optimized for CI environment

