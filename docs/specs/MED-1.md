MED-1 — Medication Domain (CRUD + Persistence)
==============================================

Goal
----

Introduce a standardized **Medication** domain CRUD implementation aligned with the project architecture (FormRequests, Services, Policies, OpenAPI, tests).

Scope
-----

### In scope
* Database table medications (already exists).
* Eloquent model Medication (already exists).
* Authenticated CRUD endpoints for medications.
* Ownership enforcement (user cannot access/modify another user's medications).
* Basic validation.
* Logical deletion via `is_active=false`.
* Manual testing instructions (Insomnia).

### Out of scope
* Schedules, recurrence, notifications, adherence.

Architecture Notes
------------------
* Backend: Laravel 12, REST API, Sanctum token authentication.
* Monorepo path: apps/api.
* All medication routes must be protected by auth:sanctum.
* Do not accept user_id from clients; derive from the authenticated user.

Data Model
----------
### Table: medications

Fields:
* id (pk)
* user_id (fk -> users.id, cascade on delete)
* name (string)
* dosage (string)
* instructions (text, nullable)
* is_active (boolean, default true)
* created_at / updated_at

Indexes:
* (user_id, is_active)

Validation rules (high level):
* name required, string, max 255
* dosage required, string, max 255
* instructions optional, string
* is_active optional, boolean

API Endpoints
-------------
Base path: /api

### List medications

GET /medications
* Returns medications belonging to authenticated user.
* Default behavior: return only is_active=true medications.
* Optional query:
    * include_inactive=true to return all.

Response: 200 OK
Array of medication resources.

### Create medication

POST /medications
Request body:
* name (required)
* dosage (required)
* instructions (optional)
* is_active (optional, boolean)

Response: 201 Created
Returns created medication.

### Get medication

GET /medications/{id}
* Must enforce ownership.
Response: 200 OK or 404 Not Found

### Update medication

PUT /medications/{id}
* Must enforce ownership.
* Allows updating name/dosage/instructions/is_active.
Response: 200 OK

### Deactivate medication

DELETE /medications/{id}
* Logical deletion: set is_active=false (do not hard delete).
Response: 200 OK with message or 204 No Content.

Resource Shape (Response)
-------------------------

Medication resource JSON:
* id
* user_id
* name
* dosage
* instructions
* is_active
* created_at
* updated_at

Ownership / Security Requirements
---------------------------------
* Any access to a medication must ensure: medication.user_id == authenticated user id.
* When creating a medication:
    * user_id is set from auth context.
* Prefer returning 404 when ownership fails (avoid leaking resource existence).

Implementation Plan (Backend)
-----------------------------

1. Controller + Requests + Service + Policy
* Create MedicationService for listing/creating/updating/deactivating.
* Create StoreMedicationRequest and UpdateMedicationRequest.
* Create MedicationPolicy and register it.
* Refactor MedicationController to use Service, FormRequests, Policy.

2. OpenAPI
* Update OpenAPI to reflect include_inactive query and request/response shape.

3. Tests
* Add Feature tests for create, ownership protection, and list filtering.

Insomnia Test Guide
-------------------

Headers for all requests:
* Accept: application/json
* Authorization: Bearer
* Content-Type: application/json (POST/PUT)

1. Create a medication
POST /medications
Body:
* name: Vitamin D
* dosage: 1 pill
* instructions: After breakfast
* is_active: true

Expected: 201 + medication JSON

2. List medications
GET /medications
Expected: 200 + array with the created medication

3. Update medication
PUT /medications/{id}
Body example:
* instructions: After lunch

Expected: 200 + updated medication

4. Deactivate medication
DELETE /medications/{id}
Expected: 200 (or 204). Medication becomes is_active=false.

5. List medications (default)
GET /medications
Expected: does NOT include inactive medication

6. List medications including inactive
GET /medications?include_inactive=true
Expected: includes the inactive medication

Acceptance Criteria
-------------------
* Medications can be created, listed, updated, and deactivated for authenticated users.
* medication ownership is enforced on show/update/delete.
* Default list excludes inactive medications, with an option to include them.
* All responses are JSON and follow consistent HTTP codes (200/201/404/401/422).
