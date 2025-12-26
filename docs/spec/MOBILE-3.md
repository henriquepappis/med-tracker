# MOBILE-3 — Medication UI (List/Create/Edit/Deactivate)

## Goal
Implement medication management UI with full CRUD using the backend API.

## Scope
- Medication List screen
- Create Medication screen
- Edit Medication screen
- Deactivate Medication action

## Backend Contract
- GET `/api/medications`
- POST `/api/medications`
- PUT `/api/medications/{id}`
- DELETE `/api/medications/{id}` (logical deactivation)

## UX Requirements
- Show loading states
- Show empty state (no meds yet)
- Show basic error messages
- Optimistic update optional (not required)

## Acceptance Criteria
- Medication list matches API
- User can create, edit, and deactivate medications
- Deactivated medications are not shown by default
