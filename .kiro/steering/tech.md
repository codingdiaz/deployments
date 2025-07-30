# Technology Stack

## Core Framework
- **Backstage**: v1.41.0 - Open-source developer portal platform
- **Node.js**: v20 or v22 (specified in engines)
- **TypeScript**: v5.8.0
- **React**: v18.0.2 with React Router v6

## Build System & Package Management
- **Yarn**: v4.4.1 (Berry) with workspaces
- **Backstage CLI**: Primary build tool for all operations
- **Docker**: Backend containerization support

## Frontend Stack
- **Material-UI**: v4 for UI components
- **React Testing Library**: For component testing
- **Playwright**: For E2E testing

## Backend Stack
- **Express.js**: Web framework
- **PostgreSQL**: Database (with pg driver)
- **SQLite**: Alternative database (better-sqlite3)
- **Zod**: Schema validation

## Development Tools
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Jest**: Unit testing framework

## Common Commands

### Development
```bash
yarn install          # Install dependencies
yarn start            # Start development server
yarn test             # Run unit tests
yarn test:e2e         # Run E2E tests with Playwright
```

### Building
```bash
yarn build:all        # Build all packages
yarn build:backend    # Build backend only
yarn build-image      # Build Docker image
```

### Code Quality
```bash
yarn lint             # Lint changed files since origin/main
yarn lint:all         # Lint all files
yarn fix              # Auto-fix linting issues
yarn prettier:check   # Check code formatting
yarn tsc              # Type check
```

### Utilities
```bash
yarn clean            # Clean build artifacts
yarn new              # Scaffold new Backstage components
```

Make sure to run jest tests WITHOUT watch mode.