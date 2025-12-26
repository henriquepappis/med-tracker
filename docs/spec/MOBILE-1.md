# MOBILE-1 — App Bootstrap (Expo + TypeScript)

## Goal
Bootstrap the mobile app using **Expo + React Native + TypeScript** within the monorepo.

## Scope
- Initialize Expo app under `apps/mobile`
- Configure TypeScript
- Configure navigation baseline
- Configure environment configuration strategy (dev only)
- Setup lint/typecheck scripts

## Constraints
- Do not implement business features yet (auth, meds, schedules)
- Keep dependencies minimal
- Prefer a clean folder structure aligned with `docs/architecture.md`

## Deliverables
- Expo project bootstrapped in `apps/mobile`
- A basic Home screen rendering "Med Tracker"
- Navigation scaffold (stack or tabs; minimal)
- `npm run lint` and `npm run typecheck` available

## Acceptance Criteria
- `npm install` works in `apps/mobile`
- `npm start` launches Expo dev server
- App runs on Expo Go or iOS simulator
