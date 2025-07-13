# Project Configuration

## Package Manager
- **pnpm** - Fast, disk space efficient package manager

## UI Framework
- **shadcn/ui** - Reusable components built using Radix UI and Tailwind CSS

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
pnpm type-check
```

## Environment Variables
Configure the following in your `.env.local`:
- Database connection (Neon)
- Clerk authentication keys
- Any additional API keys or configuration