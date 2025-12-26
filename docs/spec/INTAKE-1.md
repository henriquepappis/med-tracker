# INTAKE-1 — Intake Tracking Domain

## Goal
Record user actions related to scheduled medication intake.

---

## Intake Types
- taken
- skipped

Missed intakes are **derived**, never created manually.

---

## Data Model

Intake fields:
- id
- schedule_id
- medication_id
- user_id
- status (`taken`, `skipped`)
- taken_at (UTC timestamp)
- created_at

---

## API Endpoints

All routes protected by `auth:sanctum`.

- POST `/api/intakes`
- GET `/api/intakes`

---

## Rules & Constraints
- Intake must belong to an active schedule
- User must own the medication
- All timestamps stored in UTC
- No intake can be created for inactive schedules

---

## Acceptance Criteria
- Users can record taken or skipped doses
- Intakes are immutable once created
