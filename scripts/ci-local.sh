#!/bin/bash

# Local CI Script - Run the same checks as GitHub Actions locally
# Usage: ./scripts/ci-local.sh [test|build|lint|all]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to run tests
run_tests() {
    print_status "Running tests..."
    
    if [ ! -f ".env.test" ]; then
        print_warning "Creating .env.test file..."
        cat > .env.test << EOF
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/trading212_test
NEXTAUTH_SECRET=test-secret
NEXTAUTH_URL=http://localhost:3000
TRADING212_DEMO_API_URL=https://demo.trading212.com/api/v1
TRADING212_LIVE_API_URL=https://live.trading212.com/api/v1
OPENAI_API_KEY=test-key
EOF
    fi
    
    # Check if PostgreSQL is running
    if ! command_exists psql; then
        print_error "PostgreSQL is not installed or not in PATH"
        exit 1
    fi
    
    # Create test database if it doesn't exist
    print_status "Setting up test database..."
    createdb trading212_test 2>/dev/null || true
    
    # Run Prisma setup
    print_status "Running Prisma setup..."
    npx prisma generate
    npx prisma db push --force-reset
    npm run db:seed
    
    # Run tests
    print_status "Running Jest tests..."
    npm test -- --coverage --watchAll=false
    
    print_success "Tests completed successfully!"
}

# Function to run build
run_build() {
    print_status "Running build..."
    
    # Check if .env.local exists
    if [ ! -f ".env.local" ]; then
        print_warning ".env.local not found. Creating from .env.example..."
        if [ -f ".env.example" ]; then
            cp .env.example .env.local
        else
            print_error ".env.example not found. Please create .env.local manually."
            exit 1
        fi
    fi
    
    # Run build
    npm run build
    
    print_success "Build completed successfully!"
}

# Function to run linting
run_lint() {
    print_status "Running linting..."
    
    # Run ESLint
    print_status "Running ESLint..."
    npm run lint
    
    # Check TypeScript
    print_status "Checking TypeScript..."
    npx tsc --noEmit
    
    # Check Prettier
    print_status "Checking Prettier..."
    npx prettier --check "src/**/*.{ts,tsx,js,jsx,json,css,md}" || {
        print_warning "Prettier check failed. Run 'npx prettier --write' to fix formatting."
    }
    
    # Check for TODO/FIXME comments
    print_status "Checking for TODO/FIXME comments..."
    if grep -r "TODO\|FIXME" src/ --exclude-dir=node_modules; then
        print_warning "Found TODO/FIXME comments. Please address them before committing."
    fi
    
    # Check for console.log statements
    print_status "Checking for console.log statements..."
    if grep -r "console\.log" src/ --exclude-dir=node_modules; then
        print_warning "Found console.log statements. Please remove them before committing."
    fi
    
    print_success "Linting completed successfully!"
}

# Function to run security audit
run_security() {
    print_status "Running security audit..."
    
    # Run npm audit
    print_status "Running npm audit..."
    npm audit --audit-level moderate || {
        print_warning "npm audit found vulnerabilities. Please review and fix them."
    }
    
    print_success "Security audit completed!"
}

# Function to run all checks
run_all() {
    print_status "Running all CI checks..."
    
    run_lint
    run_tests
    run_build
    run_security
    
    print_success "All CI checks completed successfully!"
}

# Main script logic
case "${1:-all}" in
    test)
        run_tests
        ;;
    build)
        run_build
        ;;
    lint)
        run_lint
        ;;
    security)
        run_security
        ;;
    all)
        run_all
        ;;
    *)
        echo "Usage: $0 [test|build|lint|security|all]"
        echo ""
        echo "Commands:"
        echo "  test     - Run tests with coverage"
        echo "  build    - Build the application"
        echo "  lint     - Run linting and code quality checks"
        echo "  security - Run security audit"
        echo "  all      - Run all checks (default)"
        exit 1
        ;;
esac

