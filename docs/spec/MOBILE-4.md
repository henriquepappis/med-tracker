# MOBILE-4 — Scheduling UI (Create/List/Deactivate)

## Goal
Allow users to create and manage schedules for a medication.

## Scope
- Schedule list per medication
- Create schedule flow supporting:
  - daily (times)
  - weekly (weekdays + times)
  - interval (every X hours)
- Deactivate schedule

## Backend Contract
- Use SCHED-1 endpoints:
  - POST `/api/schedules`
  - GET `/api/medications/{medicationId}/schedules`
  - PUT `/api/schedules/{id}`
  - DELETE `/api/schedules/{id}`

## UX Requirements
- Clear recurrence picker
- Proper time picking UI (native time picker)
- Basic validation on client

## Acceptance Criteria
- User can create schedules and see them listed per medication
- User can deactivate schedules
