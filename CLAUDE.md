# Project Configuration

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

# Build for production
pnpm build

# Run linting
pnpm lint

# Run type checking
pnpm typecheck

# Database commands
pnpm db:generate  # Generate migrations
pnpm db:push      # Push to database
```

## Code Quality Requirements
**IMPORTANT**: Always run these commands after making any code changes:

```bash
# Check for linting issues
pnpm lint

# Check for TypeScript errors
pnpm typecheck
```

These commands must pass before considering any code change complete. This ensures:
- Code follows project style guidelines
- No TypeScript type errors exist
- Code quality standards are maintained

## Environment Variables
Configure the following in your `.env.local`:
- Database connection (Neon)
- Clerk authentication keys
- Any additional API keys or configuration