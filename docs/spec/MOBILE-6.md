# MOBILE-6 — Intake Tracking UI (Timeline + History)

## Goal
Provide a UI to record and visualize intake history.

## Scope
- Daily timeline view
- History list (last 7/30 days)
- Quick actions to record:
  - taken
  - skipped

## Backend Contract
- Uses INTAKE-1 endpoints:
  - POST `/api/intakes`
  - GET `/api/intakes`

## Acceptance Criteria
- User can record taken/skipped actions
- History shows recorded intakes
- UI displays timeline grouped by day
