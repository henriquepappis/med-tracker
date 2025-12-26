# INTAKE-2 — Derived Missed Intakes & Adherence Engine

## Goal

Introduce a **derived intake engine** responsible for inferring missed doses and calculating **adherence metrics** based on schedules and recorded intakes.

This phase completes the intake domain by separating **explicit user actions** from **computed outcomes**, enabling reliable reporting and analytics.

---

## Context

In INTAKE-1, only **explicit actions** are stored:

* taken
* skipped
* postponed

However, users often:

* forget to log an intake
* ignore a reminder
* partially follow schedules

INTAKE-2 introduces **derived logic** to determine what *should have happened* versus what *did happen*.

---

## Scope

### In scope

* Derivation of missed intakes (not manually created).
* Definition of tolerance windows.
* Adherence calculations (per medication, schedule, time range).
* Query-time computation (no persistence of missed records).
* APIs to expose adherence summaries.

### Out of scope

* Notifications.
* Schedule creation logic.
* Visualization (mobile charts).
* ML or probabilistic predictions.

---

## Core Concepts

### Recorded Intake

An intake explicitly created by the user:

* taken
* skipped
* postponed

Persisted in database.

### Expected Intake

A dose that **should have occurred** according to a schedule.

Not persisted.

### Missed Intake (Derived)

An expected intake that:

* has no corresponding taken or skipped
* exceeded the tolerance window

Computed dynamically.

---

## Definitions

### Tolerance Window

A grace period after the scheduled time.

Default:

* 30 minutes

Configurable:

* global default
* overridable per schedule (future extension)

---

## Derivation Rules

For each **schedule occurrence**:

1. Determine expected datetime (UTC, normalized).
2. Search for a recorded intake:

   * same schedule
   * within tolerance window
3. If found:

   * status = recorded (taken or skipped)
4. If not found and current time is greater than scheduled time plus tolerance:

   * status = missed
5. If current time is less than scheduled time plus tolerance:

   * status = pending (not yet classified)

---

## Status Matrix

Taken intake exists → taken

Skipped intake exists → skipped

No intake and beyond tolerance → missed

No intake and within tolerance → pending

---

## Data Model (No New Tables)

INTAKE-2 **does not introduce new tables**.

Derived data exists only:

* in memory
* in API responses
* in report calculations

---

## API Endpoints

Base path: /api

### Adherence Summary

GET /reports/adherence

Query parameters:

* from (date, required)
* to (date, required)
* medication_id (optional)
* schedule_id (optional)

Response fields:

* period.from
* period.to
* summary.expected
* summary.taken
* summary.skipped
* summary.missed
* summary.adherence_rate

---

### Detailed Timeline (Derived)

GET /reports/intake-timeline

Query parameters:

* from
* to
* schedule_id

Each item includes:

* scheduled_at
* status (taken, skipped, missed, pending)

---

## Adherence Calculation

adherence_rate = taken / expected

Notes:

* skipped is excluded from denominator
* missed counts as expected but not taken

---

## Architecture Notes

* Derivation logic must live in a **Service layer**:

  * IntakeDerivationService
* Controllers must not embed time logic.
* Use immutable value objects for time comparison where possible.
* All computations must respect:

  * user timezone
  * schedule timezone normalization

---

## Performance Considerations

* Avoid N+1 queries.
* Preload schedules.
* Preload intakes.
* Use date range batching.
* Cache derived results only if needed (future).

---

## Testing Strategy

### Unit tests

* Derivation logic edge cases.
* Tolerance window boundaries.
* Timezone conversions.

### Feature tests

* Mixed scenarios (taken and missed).
* Multiple schedules.
* Partial adherence.

---

## Acceptance Criteria

* Missed intakes are **never persisted**.
* Derived statuses are deterministic and reproducible.
* Adherence metrics match expected outcomes.
* No schedule occurrence is double-counted.
* APIs return consistent results across timezones.

---

## Dependencies

Requires:

* SCHED-1
* INTAKE-1

Enables:

* REPORT-1 (accurate adherence)
* REPORT-2 (advanced analytics)

---

## Notes for AI-Assisted Development

* Do not persist missed intakes.
* Always recompute from source of truth.
* Favor clarity over premature optimization.
* Time handling must be explicit and well-tested.
