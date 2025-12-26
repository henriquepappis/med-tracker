# SCHED-2 — Schedule Validation Rules

## Goal
Ensure schedule definitions are valid, consistent, and safe.

---

## Validation Rules

### General
- At least one time must be provided
- Times must follow HH:mm format
- Times must be unique per schedule

---

### Weekly
- At least one weekday is required
- Weekdays must be valid (`mon`–`sun`)

---

### Interval-based
- `interval_hours` must be >= 1
- Interval schedules must not define weekdays

---

## Overlap Rules
- A medication cannot have two active schedules with:
  - identical recurrence type
  - identical times
  - overlapping weekdays (weekly)

---

## Acceptance Criteria
- Invalid schedules are rejected with clear validation errors
- Overlapping schedules are prevented
