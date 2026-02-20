# Contributing

Thanks for your interest in contributing! Here's how to get started.

## Setup

```bash
git clone https://github.com/TyposBro/cloudflare-hono-starter.git
cd cloudflare-hono-starter
npm install
```

Create a local D1 database and run migrations:

```bash
npm run db:migrate:local
```

Copy the example env file and set your secrets:

```bash
cp .dev.vars.example .dev.vars
```

Start the dev server:

```bash
npm run dev
```

## Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Run checks:
   ```bash
   npm run typecheck
   npm test
   ```
5. Commit with a descriptive message following [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat: add comments feature`
   - `fix: handle empty pagination query`
   - `docs: update deployment instructions`
6. Push to your fork and open a Pull Request

## Adding a New Feature

Follow the vertical slice pattern:

```bash
mkdir -p src/features/my-feature/{api,core,data}
```

1. Add your table to `src/db/schema.ts`
2. Generate migration: `npm run db:generate`
3. Build the slice: repository → service → contract → routes
4. Register in `src/di.ts` and mount in `src/index.ts`

See the README's "Adding a New Feature" section for a detailed walkthrough.

## Code Style

- Use TypeScript strict mode (already enforced by `tsconfig.json`)
- Use `@/` absolute imports for cross-module references
- Keep within-feature imports relative (`../data/...`, `../core/...`)
- Follow the existing patterns — consistency matters more than personal preference

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Include a clear description of what changed and why
- Make sure `npm run typecheck` and `npm test` pass
- Add tests for new business logic in the service layer
