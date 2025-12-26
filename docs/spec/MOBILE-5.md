# MOBILE-5 — Notifications & Reminders (Local)

## Goal
Implement local notifications that remind the user to take medications based on schedules.

## Scope
- Request notification permissions
- Schedule local notifications based on schedule definitions
- Provide quick actions (Taken / Skip / Postpone) if supported by platform
- Minimal rescheduling logic

## Constraints
- No server-push notifications
- Must respect user timezone preference
- Do not implement full recurrence engine on mobile if backend provides computed next dose (future)

## Acceptance Criteria
- User receives local notifications for upcoming doses
- User can mark taken or skipped from the app (notification action optional)
- Notifications reschedule reliably after app restart
