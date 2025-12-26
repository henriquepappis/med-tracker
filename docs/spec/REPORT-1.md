# REPORT-1 — Adherence Reporting

## Goal
Provide read-only adherence metrics derived from intakes and schedules.

---

## Metrics

- Daily adherence (%)
- Weekly adherence (%)
- Monthly adherence (%)

---

## API Endpoints

- GET `/api/reports/adherence/daily`
- GET `/api/reports/adherence/weekly`
- GET `/api/reports/adherence/monthly`

---

## Rules
- Reports are derived data only
- No writes allowed
- Missing intakes inferred from schedules

---

## Acceptance Criteria
- Reports reflect accurate adherence percentages
- Data is scoped to authenticated user only
