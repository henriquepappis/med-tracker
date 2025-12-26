# OFFLINE-2 — Offline Intake Queue & Sync

## Goal
Allow users to record intake actions while offline and sync later.

## Scope
- Queue intake actions locally
- Background sync when connectivity is restored
- Conflict resolution using timestamps

## Constraints
- Do not allow editing queued actions
- Backend remains source of truth
- Sync must be idempotent

## Acceptance Criteria
- User can record taken/skipped while offline
- Actions sync automatically when online
- No duplicated intakes are created
