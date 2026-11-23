# LBT

LBT is a social application for sharing moments, discovering short-form video, and staying connected through private conversations.

## Product

The application brings together a personalized home feed, creator profiles, stories, Reels, post interactions, and direct messaging. Account privacy and profile controls are managed within the app.

## Technology

- React and TypeScript
- Vite
- Supabase (authentication, database, and storage)
- Capacitor for native mobile builds
- Tailwind CSS and Motion

## Requirements

- Node.js 20 or newer
- npm
- A configured Supabase project

## Getting started

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Create a local environment file:

   **Windows PowerShell**
   ```powershell
   Copy-Item .env.example .env
   ```

   **macOS / Linux**
   ```bash
   cp .env.example .env
   ```

3. Set the required values in `.env`:

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   Optional server-side integrations can be configured with the corresponding non-`VITE_` variables documented in `.env.example`. Never expose a Supabase service-role key or other private credentials in client-side variables.

4. Start the development environment:

   ```bash
   npm run dev
   ```

## Quality checks

Run the TypeScript check:

```bash
npm run lint
```

Create a production build:

```bash
npm run build
```

## Project structure

- `src/` — application interface, pages, components, and client-side services
- `server.ts` — server-side API routes and integrations
- `supabase/` — database migrations and Supabase configuration
- `android/` — native Android project
- `public/` — static assets

## Configuration and security

Local environment files are excluded from version control. Keep credentials in your local environment or deployment provider's secret manager. The Supabase client uses the publishable/anonymous key; privileged keys must remain server-side.

Database migrations should be reviewed and applied through the project's normal deployment process. Do not run unreviewed SQL scripts against a production database.
