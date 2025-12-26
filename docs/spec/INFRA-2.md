# INFRA-2 — Mobile CI Pipeline

## Goal
Add CI checks for the mobile app.

## Scope
- Linting
- Type checking
- Build validation (no publish)

## Constraints
- CI only (no store upload)
- Fail PRs on errors

## Acceptance Criteria
- Mobile CI runs on PRs
- Type errors and lint errors block merge
