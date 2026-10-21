#!/usr/bin/env bash

# ==============================================================================
# KULI Logistics Platform — Unified Developer & Operations CLI
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${BLUE}${BOLD}[KULI INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}${BOLD}[KULI SUCCESS]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}${BOLD}[KULI WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}${BOLD}[KULI ERROR]${NC} $1"
}

print_header() {
  echo -e "${CYAN}${BOLD}"
  echo "  ██╗  ██╗██╗   ██╗██╗     ██╗    "
  echo "  ██║ ██╔╝██║   ██║██║     ██║    "
  echo "  █████╔╝ ██║   ██║██║     ██║    "
  echo "  ██╔═██╗ ██║   ██║██║     ██║    "
  echo "  ██║  ██╗╚██████╔╝███████╗██║    "
  echo "  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝    "
  echo -e "  Logistics Platform CLI v1.0.0${NC}\n"
}

print_usage() {
  print_header
  echo -e "${BOLD}Usage:${NC} ./run.sh <command> [options]"
  echo ""
  echo -e "${BOLD}Development Servers:${NC}"
  echo "  dev:api           Start the Node.js REST API with hot reload"
  echo "  dev:customer      Start the Customer Mobile App (Expo, booking flavor)"
  echo "  dev:driver        Start the Driver Mobile App (Expo, driver/owner flavor)"
  echo "  dev:mobile        Start the standard Mobile App workspace"
  echo "  dev:admin         Start the Admin & Operations web console (Vite)"
  echo "  dev:landing       Start the Marketing Landing page"
  echo ""
  echo -e "${BOLD}Docker Infrastructure:${NC}"
  echo "  docker:up         Start PostgreSQL, Redis, and MongoDB in background"
  echo "  docker:down       Stop all local Docker containers"
  echo "  docker:status     Show running container status and ports"
  echo "  docker:logs       Follow logs from all Docker containers"
  echo ""
  echo -e "${BOLD}Testing & Quality Assurance:${NC}"
  echo "  test              Run all unit and integration test suites"
  echo "  test:auth         Run dedicated authentication and security test suites"
  echo "  test:e2e          Run integration and end-to-end journey tests"
  echo "  lint              Run file verification and code linting"
  echo "  typecheck         Verify TypeScript definitions and route contracts"
  echo "  verify            Run complete startup verification across all apps"
  echo ""
  echo -e "${BOLD}Data Management:${NC}"
  echo "  seed:demo         Seed demo data (truck classes, pricing rules, demo users)"
  echo "  seed:fake-users   Seed simulated client and driver accounts"
  echo "  reset:auth        Clear local authentication cache and tokens"
  echo ""
}

COMMAND="${1:-help}"

case "$COMMAND" in
  help|--help|-h)
    print_usage
    ;;

  dev:api)
    log_info "Starting KULI API service on port 4000..."
    npm run dev:api
    ;;

  dev:customer)
    log_info "Starting KULI Customer Mobile App..."
    export KULI_APP_VARIANT=customer
    npm run dev:customer
    ;;

  dev:driver)
    log_info "Starting KULI Driver / Truck Owner Mobile App..."
    export KULI_APP_VARIANT=driver
    npm run dev:driver
    ;;

  dev:mobile)
    log_info "Starting KULI Mobile workspace..."
    npm run dev:mobile
    ;;

  dev:admin)
    log_info "Starting KULI Admin Operations Console..."
    npm run dev:admin
    ;;

  dev:landing)
    log_info "Starting KULI Marketing Landing page..."
    npm run dev:landing
    ;;

  docker:up)
    log_info "Launching Docker containers (PostgreSQL 16, Redis 7, MongoDB 7)..."
    docker compose up -d
    log_success "Docker infrastructure is up and running."
    docker compose ps
    ;;

  docker:down)
    log_info "Stopping Docker containers..."
    docker compose down
    log_success "Docker infrastructure stopped."
    ;;

  docker:status)
    docker compose ps
    ;;

  docker:logs)
    docker compose logs -f
    ;;

  test)
    log_info "Executing full test suite..."
    npm test
    log_success "All tests passed successfully."
    ;;

  test:auth)
    log_info "Executing Authentication and Role Security test suites..."
    node --test tests/auth/*.test.mjs
    log_success "Authentication test suites passed."
    ;;

  test:e2e)
    log_info "Executing End-to-End Integration and Server HTTP test suites..."
    node --test tests/integration/*.test.mjs tests/e2e/*.test.mjs
    log_success "Integration and E2E test suites passed."
    ;;

  lint)
    log_info "Running repository lint checks..."
    npm run lint
    log_success "Lint checks passed."
    ;;

  typecheck)
    log_info "Running contract and TypeScript checks across apps..."
    npm run typecheck:all
    log_success "Typecheck passed."
    ;;

  typecheck:mobile)
    log_info "Running Mobile app TypeScript checks..."
    npm run typecheck:mobile
    log_success "Mobile TypeScript checks passed."
    ;;

  verify)
    log_info "Verifying startup readiness across apps..."
    npm run verify:startup
    log_success "All apps verified ready."
    ;;

  seed:demo)
    log_info "Seeding demo data..."
    npm run seed:demo
    log_success "Demo data seeded."
    ;;

  seed:fake-users)
    log_info "Seeding fake users..."
    npm run seed:fake-users
    log_success "Fake users seeded."
    ;;

  reset:auth)
    log_info "Resetting authentication data..."
    npm run reset:auth-data
    log_success "Auth data reset."
    ;;

  *)
    log_error "Unknown command: $COMMAND"
    echo ""
    print_usage
    exit 1
    ;;
esac
