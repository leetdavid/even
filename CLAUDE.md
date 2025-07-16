# Project Configuration

This is a splitwise clone, meant for sharing expenses with friends, family, and colleagues.

## Package Manager

- **pnpm** - Fast, disk space efficient package manager

## UI Framework

- **shadcn/ui** - Reusable components built using Radix UI and Tailwind CSS
- **next-themes** - Dark mode support with system detection

## Database

- **Neon** - Serverless Postgres database
- **Drizzle ORM** - TypeScript ORM for database operations

## Authentication

- **Clerk** - Complete authentication and user management solution

## Deployment

- **Vercel** - Platform for frontend frameworks and static sites

## Development Commands

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Test code
pnpm test          # unit tests
pnpm test:ui       # UI tests with Playwright
pnpm test:coverage # Test coverage

# Build for production
pnpm build

# Run linting
pnpm lint

# Run type checking
pnpm typecheck

# Format code
pnpm format:write

# Database commands
pnpm db:generate  # Generate migrations
pnpm db:push      # Push to database
```

## Code Quality Requirements

When writing new code, consider whether it needs to be tested. If it does, write a test for it.

**IMPORTANT**: Always run these commands after making any block of code changes:

```bash
# Check for linting issues
pnpm lint

# Check for TypeScript errors
pnpm typecheck

# Check for test failures
pnpm test

# Format code
pnpm format:write
```

**IMPORTANT**: Do not run the database commands yourself. Prompt the user to do it for you, since the AI gets stuck in the interactive mode.

These commands must pass before considering any code change complete. This ensures:

- Code follows project style guidelines
- No TypeScript type errors exist
- Code quality standards are maintained

## Environment Variables

Configure the following in your `.env`:

- Database connection (Neon)
- Clerk authentication keys
- Any additional API keys or configuration
