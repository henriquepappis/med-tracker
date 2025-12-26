# SCHED-1 — Schedule Core Domain

## Goal
Implement the core **Schedule** domain, allowing users to define when a medication should be taken.

Schedules must:
- belong to a medication
- belong to the authenticated user (indirectly via medication)
- support different recurrence strategies
- be logically deactivated

---

## Scope

### Supported Recurrence Types
1. **Daily**
   - One or more times per day
2. **Weekly**
   - Specific weekdays
   - One or more times per day
3. **Interval-based**
   - Every X hours

---

## Data Model

Schedule fields:
- id
- medication_id
- recurrence_type (`daily`, `weekly`, `interval`)
- times (array of HH:mm)
- weekdays (optional array, weekly only)
- interval_hours (optional, interval only)
- is_active (boolean)
- created_at
- updated_at

---

## API Endpoints

All routes must be protected by `auth:sanctum`.

- POST `/api/schedules`
- GET `/api/medications/{medicationId}/schedules`
- PUT `/api/schedules/{id}`
- DELETE `/api/schedules/{id}` (logical deactivation)

---

## Rules & Constraints

- `user_id` must never be accepted from input
- Medication ownership must be enforced
- Inactive schedules must not be returned by default
- Validation errors must return JSON 422

---

## Out of Scope
- Intake tracking
- Notification triggering
- Missed dose calculation

---

## Acceptance Criteria
- A user can create schedules only for their own medications
- A user cannot access or modify schedules from other users
- Deactivated schedules are excluded from queries
