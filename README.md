<p>
  <!-- iOS -->
  <a href="https://itunes.apple.com/app/apple-store/id982107779">
    <img alt="Supports Expo iOS" longdesc="Supports Expo iOS" src="https://img.shields.io/badge/iOS-4630EB.svg?style=flat-square&logo=APPLE&labelColor=999999&logoColor=fff" />
  </a>
  <!-- Android -->
  <a href="https://play.google.com/store/apps/details?id=host.exp.exponent&referrer=blankexample">
    <img alt="Supports Expo Android" longdesc="Supports Expo Android" src="https://img.shields.io/badge/Android-4630EB.svg?style=flat-square&logo=ANDROID&labelColor=A4C639&logoColor=fff" />
  </a>
  <!-- Web -->
  <a href="https://docs.expo.dev/workflow/web/">
    <img alt="Supports Expo Web" longdesc="Supports Expo Web" src="https://img.shields.io/badge/web-4630EB.svg?style=flat-square&logo=GOOGLE-CHROME&labelColor=4285F4&logoColor=fff" />
  </a>
  <a href="https://launch.expo.dev/?github=https://github.com/greeenboi/daily-planner-app">
    <img alt="Launch with Expo" longdesc="Click to deploy this app" src="https://github.com/expo/examples/blob/master/.gh-assets/launch.svg?raw=true" />
  </a>
</p>

# Daily Planner

## Introduction
Daily Planner is an Expo (React Native) application that lets a signed-in user create, view and manage scheduled tasks with time ranges, optional reminders, repetition rules and tagging. Authentication is handled through Better Auth with a Prisma-backed data store. The same codebase serves API routes (for auth and tasks) and the mobile/web client. Local SQLite (via Prisma) is used in development; a LibSQL/Turso database can be enabled in production through environment variables.

## Features
- User authentication (email and password) via Better Auth
- Session handling using secure tokens or cookies (API routes)
- Create, read and update tasks with start and end timestamps
- Support for all‑day tasks and status (pending, in progress, completed, canceled)
- Task priority levels and optional color labeling
- Reminders with configurable minute offsets and delivery method placeholder fields
- Basic recurrence support through repeat rules (frequency, interval, until, count)
- Tagging system (user‑scoped tags) and participant relationships
- Simple tasks API (fetch by date, create, update) under `app/api/tasks`
- React Native UI components styled with NativeWind and Gluestack UI
- Environment‑driven selection between local SQLite and LibSQL adapter

## Gallery
Below are placeholder references for where to add screenshots. Replace the file paths or add hosted image URLs when assets are ready.

| Screen | Description | Path / Placeholder |
| ------ | ----------- | ------------------ |
| Sign In | User authentication screen | (add screenshot) |
| Onboarding | Initial guidance / setup flow | (add screenshot) |
| Task List (Day) | Tasks filtered by selected day | (add screenshot) |
| Task Creation | Form to enter title, times, reminders | (add screenshot) |
| Task Detail | Expanded task view with participants and tags | (add screenshot) |

Place image files (e.g. PNG) in a `docs/screenshots` directory or upload them to an image host (GitHub assets, CDN) and change `(add screenshot)` with `![Alt text](relative/or/url.png)`.




## 🚀 How to use

Run prisma generate

```bash
npx prisma generate
```

Start the server

```bash
npx expo start
```

For a production deployment set the following (example for Turso / LibSQL):

```
TURSO_DATABASE_URL=... # only on the server host
TURSO_AUTH_TOKEN=...   # only on the server host
EXPO_PUBLIC_AUTH_BASE_URL=https://your-production-domain
```

Then run migrations against the remote database:

```
npx prisma migrate deploy
```

The mobile client will talk to the deployed API at `EXPO_PUBLIC_AUTH_BASE_URL/api/auth` and `.../api/tasks`.