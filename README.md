# Tenurio Web

Tenurio is a contractor access management app.

It helps teams keep track of who a contractor is, what they can access, when that access should end, and what still needs action. The goal is simple: less spreadsheet chasing, fewer blind spots, cleaner offboarding.

## What’s in the app

- A dashboard for expiring contracts, overdue access, pending requests, and recent activity
- A contractor workspace with profile details, contract status, access history, and actions
- Request flows for sponsors to ask for changes without doing admin work directly
- Access operations for assignment, revocation, retries, and follow-up
- Team, profile, and organization settings
- Integrations for Google Workspace and Slack, with more providers staged in the UI
- A small in-app AI assistant for questions about contractor risk and access status

## Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS v4
- TanStack Query
- Axios
- PostHog

## Running it locally

1. Install dependencies:

```bash
npm install
```

2. Create or update `.env.local`

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/v1
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://t.tenurio.com
NEXT_PUBLIC_POSTHOG_UI_HOST=https://us.posthog.com
```

3. Start the app:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## A quick note on the API

This app expects a backend that handles auth, contractors, dashboard data, requests, access actions, integrations, events, feedback, and AI chat.

If `NEXT_PUBLIC_API_URL` is missing, the frontend falls back to `http://localhost:3000/v1`. For local work, it’s usually better to set this explicitly so the web app and API are not fighting over the same port.

## Main routes

- `/dashboard` for the main overview
- `/getting-started` for first-run setup
- `/contractors` for the contractor list
- `/contractors/[id]` for contractor detail and access actions
- `/sponsor` for request review and submission flows
- `/access` for access operations and revocation follow-up
- `/events` for the activity log
- `/integrations` for provider connections
- `/settings/profile`, `/settings/organization`, `/settings/team` for workspace settings

## Project shape

```text
src/app                  App routes
src/components           Shared UI and shell components
src/context              Auth session state
src/hooks                App-specific hooks
src/lib                  API client, helpers, tracking, utilities
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Product tone

Tenurio is built like an internal operations product, not a marketing site. Most screens are there to help someone answer three questions quickly:

- Who is this contractor?
- What access do they have?
- What needs to happen next?
