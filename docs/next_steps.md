# Next Steps — Med Tracker (Engineering Roadmap)

This document defines the **complete, structured roadmap** for finalizing the Med Tracker system.
Each activity is identified by a **stable engineering ID**, intended to be used across:

* specs (`docs/spec/*.md`)
* branches
* commits
* pull requests
* AI-assisted development workflows (Cursor / Codex)

---

## 0. Project Initialization & Foundations

### INIT-1 — Monorepo & Project Structure

Status: ✅ Completed

---

### INIT-2 — Engineering Documentation

* README
* Architecture
* Assistant Guide
* ADR baseline
  Status: ✅ Completed

---

### INIT-3 — Laravel API Bootstrap

* Laravel 12 setup
* API routing
* Health check
* Environment setup
  Status: ✅ Completed

---

## 1. Authentication & User Domain

### AUTH-1 — Authentication with Sanctum

* Register
* Login
* Logout
* Token-based auth
  Status: ✅ Completed

---

### USER-1 — User Preferences

* Timezone
* Language
* Profile endpoints
  Status: ✅ Completed

---

### AUTH-2 — Authorization Policies

* MedicationPolicy ✅
* SchedulePolicy ✅
* IntakePolicy ✅
  Goal: centralize ownership rules
  Status: ✅ Completed

---

### AUTH-3 — Validation & Error Standardization

* Unified validation responses
* JSON-only errors
* No HTML leaks
  Status: ✅ Completed

---

## 2. Medication Domain

### MED-1 — Medication CRUD

* Create / Read / Update / Deactivate
* User ownership enforcement
  Status: ✅ Completed

---

### MED-2 — Medication Soft Deactivation

* Logical deletion
* Filtering inactive medications by default
  Status: ✅ Completed

---

### MED-3 — Medication API Tests

* Feature tests
* Ownership scenarios
  Status: ✅ Completed

---

## 3. Scheduling Domain

### SCHED-1 — Schedule Core Domain

* Link schedules to medications
* Recurrence types:

  * Daily
  * Weekly
  * Interval-based
* Logical deletion
  Status: ✅ Completed

---

### SCHED-2 — Schedule Validation Rules

* Overlapping schedule prevention
* Recurrence integrity checks
  Status: ✅ Completed

---

### SCHED-3 — Schedule API Tests

* Schedule creation
* Ownership enforcement
  Status: ✅ Completed

---

## 4. Intake Tracking

### INTAKE-1 — Intake Domain

* Taken
* Skipped
* Missed (derived)
  Status: ✅ Completed

---

### INTAKE-2 — Intake Derivation Logic

* Compute missed doses based on schedules
* No manual “missed” creation
  Status: ✅ Completed

---

### INTAKE-3 — Intake API Tests

* Intake recording
* Edge cases
  Status: ✅ Completed

---

## 5. Reporting & Analytics

### REPORT-1 — Adherence Aggregation

* Daily metrics
* Weekly metrics
* Monthly metrics
  Status: ✅ Completed

---

### REPORT-2 — Read-only Reporting API

* No write operations
* Derived data only
  Status: ✅ Completed

---

## 6. Mobile Application (React Native / Expo)

### MOBILE-1 — App Bootstrap

* Expo + TypeScript
* Navigation
* Environment config
  Status: ✅ Completed

---

### MOBILE-2 — Authentication Flow

* Login
* Register
* Token persistence
  Status: ✅ Completed

---

### MOBILE-3 — Medication UI

* List
* Create
* Edit
* Deactivate
  Status: ✅ Completed

---

### MOBILE-4 — Scheduling UI

* Schedule creation
* Recurrence selection
* Time pickers
  Status: ✅ Completed

---

### MOBILE-5 — Notifications & Reminders

* Local notifications
* Quick actions:

  * Taken
  * Skip
  * Postpone
    Status: ✅ Completed

---

### MOBILE-6 — Intake Tracking UI

* Daily timeline
* History view
  Status: ✅ Completed

---

## 7. Internationalization (i18n)

### I18N-1 — English + Portuguese

* i18next setup
* EN as source of truth
  Status: ✅ Completed

---

### I18N-2 — Spanish & French

* Add ES / FR
* Evaluate AI-assisted translation tooling (e.g. Intlayer)
* Manual review for sensitive UI strings
  Status: ✅ Completed

---

## 8. Offline & Synchronization

### OFFLINE-1 — Offline Reads

* Cached data
* Graceful offline UI
  Status: ✅ Completed

---

### OFFLINE-2 — Offline Intake Queue

* Queue actions
* Background sync
  Status: ⏳ Planned

---

## 9. Infrastructure & CI

### INFRA-1 — Backend CI Hardening

* Lint
* Tests
* PR enforcement
  Status: ✅ Completed

---

### INFRA-2 — Mobile CI

* Type checking
* Lint
* Build validation
  Status: ✅ Completed

---

## 10. Documentation & Governance

### DOC-1 — API Documentation

* OpenAPI / Swagger
  Notes: OpenAPI spec exists; Swagger UI setup pending
  Status: ✅ Completed

---

### DOC-2 — Architecture Diagrams

* Mermaid diagrams
* Key flows
  Status: ✅ Completed

---

### ADR-1 — Localization Strategy

* Manual → AI-assisted scaling
  Status: ✅ Completed

---

### ADR-2 — Notification Strategy

* Local vs server-driven
  Status: ✅ Completed

---

## 11. App Store Readiness

### STORE-1 — iOS App Preparation

* Icons
* Splash
* Privacy policy
* Terms
  Status: ⏳ Planned

---

### STORE-2 — TestFlight Submission

* Build
* Upload
* Review readiness
  Status: ⏳ Planned

---

## 12. Portfolio Finalization

### PORTFOLIO-1 — Cleanup & Polish

* Commit history
* README final review
  Status: ⏳ Planned

---

### PORTFOLIO-2 — Demo & Showcase

* Screenshots
* GIFs
* Optional case study
  Status: ⏳ Planned

---

## Final Objective

Deliver a **production-grade, AI-assisted, well-architected medication tracking system** that demonstrates:

* backend excellence
* mobile-first thinking
* pragmatic use of AI
* internationalization readiness
* real-world engineering discipline

---

## How This Roadmap Is Used

For each activity:

1. Create a spec: `docs/spec/<ID>.md`
2. Use Cursor + Codex to implement end-to-end
3. Commit + PR using the same ID
4. Mark status as completed
