# REPORT-2 — Read-only Reporting API (Derived Data Only)

## Goal

Provide a **read-only reporting layer** exposing derived analytics and summaries based on schedules and intakes, without allowing any write or mutation operations.

This phase consolidates reporting as a **pure query domain**, fully driven by derived data (INTAKE-2), suitable for mobile consumption and analytics.

---

## Context

REPORT-1 introduced adherence aggregation and basic metrics.

REPORT-2 formalizes reporting as:

* read-only
* deterministic
* derived from source-of-truth data
* safe to expose to clients (mobile, dashboards)

No report endpoint should ever modify state or persist derived data.

---

## Scope

### In scope

* Read-only reporting endpoints.
* Adherence summaries based on derived missed logic.
* Timeline-style derived views.
* Aggregations per medication and per schedule.
* Time-range filtering.

### Out of scope

* Writing or mutating any data.
* Notifications.
* Data export (CSV/PDF).
* Admin or cross-user reports.

---

## Reporting Principles

* Reports are **derived, not stored**.
* All computations are repeatable and deterministic.
* Reports must respect:

  * user ownership
  * user timezone
* Controllers act as thin orchestration layers.
* Business logic lives in services.

---

## API Endpoints

Base path: /api/reports

---

### Adherence Summary (Expanded)

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

Optionally grouped by medication when no medication_id is provided.

---

### Medication Adherence Breakdown

GET /reports/adherence/medications

Query parameters:

* from
* to

Response per medication:

* medication_id
* medication_name
* expected
* taken
* skipped
* missed
* adherence_rate

---

### Schedule Adherence Breakdown

GET /reports/adherence/schedules

Query parameters:

* from
* to
* medication_id (optional)

Response per schedule:

* schedule_id
* medication_id
* expected
* taken
* skipped
* missed
* adherence_rate

---

### Derived Intake Timeline

GET /reports/intake-timeline

Query parameters:

* from
* to
* medication_id (optional)
* schedule_id (optional)

Each item includes:

* scheduled_at
* status (taken, skipped, missed, pending)
* medication_id
* schedule_id

Sorted chronologically.

---

## Consistency Rules

* The same input parameters must always yield the same output.
* No implicit defaults beyond documented ones.
* Missing parameters must result in validation errors (422).

---

## Architecture Notes

* Reporting logic must live in a **dedicated service layer**:

  * ReportService
* ReportService depends on:

  * IntakeDerivationService
  * Schedule domain
* Controllers must not:

  * calculate adherence
  * infer missed intakes
* No Eloquent mutations allowed inside reporting services.

---

## Performance Considerations

* Batch load schedules and intakes.
* Avoid per-item queries.
* Prefer in-memory aggregation over repeated DB queries.
* Introduce caching only after correctness is proven.

---

## Testing Strategy

### Unit tests

* Adherence calculations.
* Boundary date ranges.
* Empty data sets.
* Partial adherence scenarios.

### Feature tests

* Authenticated access only.
* Ownership enforcement.
* Cross-check counts against known fixtures.

---

## Acceptance Criteria

* All report endpoints are read-only.
* No database writes occur during report execution.
* Adherence metrics match derived intake logic.
* Timezone handling is correct and consistent.
* Unauthorized access is rejected.

---

## Dependencies

Requires:

* INTAKE-2
* SCHED-1
* INTAKE-1

Enables:

* MOBILE-6 (timeline & history UI)
* PORTFOLIO-2 (analytics showcase)

---

## Notes for AI-Assisted Development

* Do not persist any reporting data.
* Favor clarity and correctness over performance tricks.
* Treat reporting as a pure function over domain data.
* Validate inputs explicitly and early.
