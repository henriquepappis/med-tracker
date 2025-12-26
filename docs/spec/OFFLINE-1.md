# OFFLINE-1 — Offline Reads (Mobile)

## Goal
Ensure the mobile app can be used in a **read-only mode while offline**.

## Scope
- Cache last known data:
  - medications
  - schedules
  - user profile
- Display offline indicator
- Graceful fallback when API is unreachable

## Constraints
- No write operations while offline
- Use local storage only (no background sync yet)
- Data freshness clearly communicated to user

## Acceptance Criteria
- App loads cached data without network
- User sees clear offline state
- No crashes when API is unreachable
