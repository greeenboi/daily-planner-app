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

https://github.com/user-attachments/assets/2e9a32ae-354d-48c6-b988-47ad5d826a6f

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
Below are some screen captures of the ui

| Screen | Description | Screenshots |
| ------ | ----------- | ----------- |
| Sign In | User authentication screen | <img src="https://github.com/user-attachments/assets/d1f03aec-2e15-4dd8-a80a-806b940e29a3" alt="Sign In 1" width="230" /> <img src="https://github.com/user-attachments/assets/48dd101b-30b8-4fd3-80a9-f7d91a6b08b7" alt="Sign In 2" width="230" /> |
| Onboarding | Initial guidance / setup flow | <img src="https://github.com/user-attachments/assets/c87f3436-884b-4e47-bd3d-c9fcdffcd88a" alt="Onboarding 1" width="230" /> <img src="https://github.com/user-attachments/assets/ba60d673-3e5f-466c-a9d8-b73c9ec75e24" alt="Onboarding 2" width="230" /> <img src="https://github.com/user-attachments/assets/557251e6-3d8c-44e8-aa78-ff18a87dd1ae" alt="Onboarding 3" width="230" /> |
| Planner (Day) | Tasks filtered by selected day | <img src="https://github.com/user-attachments/assets/cd0b4b8a-37d1-4310-97b4-23ac4f027816" alt="Planner Day" width="230" /> |
| Tasks List | Tasks shown as a checklist | <img src="https://github.com/user-attachments/assets/34425ffe-d446-4310-8340-786a713b5ebc" alt="Tasks List" width="230" /> |
| Task Detail | Expanded task view with participants and tags | <img src="https://github.com/user-attachments/assets/185490af-45d1-45b5-a32e-e921f0adf9c9" alt="Task Detail" width="230" /> |


> [!NOTE]
> Current master branch may have breaking changes detach to commit `9ec40a5a5ea77994056dc451c0533baec95e249e` when working / using the app

## TODO

The current app structure acts as a monorepo to bundle the server into a web compoenent outside of expo's android/ios build. The problem is that prisma depends on `node:fs` runtime which is not currently supported in [EAS hosting](https://docs.expo.dev/eas/hosting/reference/worker-runtime/#nodejs-compatibility), As a result I have to refactor the whole thing to a cloud build which does not depend on `node:fs`. I have tried uploading the `dist` to netlify, hosting on vercel, and even switching to turso + libsql for an entire overhaul on the system. All current implementations just point to use a different backend schema that does not depend on prisma. 
So i will have to do:
- [ ] Remove prisma implementation
- [ ] check expo-sqlite feasability for better-auth
- [ ] Refactor backend to make calls to server (hono-ts) if expo-sqlite does not work out
- [ ] Refactor logic to work on only cloud / only local build based on option 2

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


