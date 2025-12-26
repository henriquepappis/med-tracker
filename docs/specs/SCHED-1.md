SCHED-1 — Schedule Domain (CRUD + Persistence)
==============================================

Goal
----

Introduce the **Schedule** domain to connect **Medications** to **planned dose times**. This milestone focuses on **data modeling + CRUD API** only. No recurrence engine, notifications, or intake generation is implemented in SCHED-1.

Scope
-----

### In scope
*   Database table schedules with a minimal, extensible schema.
*   Eloquent model Schedule.
*   Authenticated CRUD endpoints for schedules.
*   Ownership enforcement (user cannot access/modify another user's schedules).
*   Basic validation.
*   Manual testing instructions (Insomnia).

### Out of scope (explicitly NOT in SCHED-1)
*   Recurrence computation engine (daily/weekly/interval expansion).
*   Generating dose instances.
*   Push/local notifications integration.
*   Intake tracking / adherence.
*   Advanced timezone handling beyond storing user timezone (already done in USER-1).

Architecture Notes
------------------
*   Backend: Laravel 12, REST API, Sanctum token authentication.
*   Monorepo path: apps/api.
*   All schedule routes must be protected by auth:sanctum.
*   Do not accept user\_id from clients; derive from the authenticated user.
*   Schedules belong to a Medication which belongs to a User.

Data Model
----------
### Table: schedules

Fields:
*   id (pk)
*   user\_id (fk -> users.id, cascade on delete)
*   medication\_id (fk -> medications.id, cascade on delete)
*   type (string / enum-like): daily, weekly, interval
*   payload (json): schedule configuration specific to type
*   starts\_at (timestamp, nullable)
*   ends\_at (timestamp, nullable)
*   is\_active (boolean, default true)
*   created\_at / updated\_at

Constraints:
*   user\_id must always match the medication owner.
*   medication\_id must belong to the authenticated user.
*   type must be one of daily|weekly|interval.

Indexes:
*   (user\_id, medication\_id)
*   (user\_id, is\_active)

### Payload shapes

All payloads are JSON.
1.  type = daily
*   times: array of strings HH:MM (24h)Example:
*   payload = { "times": \["08:00", "20:00"\] }

1.  type = weekly
*   days: array of integers 1..7 (ISO-8601 weekday, 1=Mon, 7=Sun)
*   times: array of strings HH:MMExample:
*   payload = { "days": \[1,3,5\], "times": \["09:00"\] }

1.  type = interval
*   every\_minutes: integer (e.g. 480 for 8h)
*   anchor\_time: string HH:MM (optional but recommended)Example:
*   payload = { "every\_minutes": 480, "anchor\_time": "08:00" }

Validation rules (high level):
*   daily: times required, non-empty, valid HH:MM.
*   weekly: days required, non-empty, each 1..7; times required.
*   interval: every\_minutes required integer >= 15; anchor\_time optional HH:MM.

API Endpoints
-------------
Base path: /api

### List schedules

GET /schedules
*   Returns schedules belonging to authenticated user.
*   Default behavior: return only is\_active=true schedules.
*   Optional query:
    *   include\_inactive=true to return all.

Response: 200 OKArray of schedule resources.

### Create schedule

POST /schedulesRequest body:
*   medication\_id (required)
*   type (required)
*   payload (required)
*   starts\_at (optional, ISO datetime)
*   ends\_at (optional, ISO datetime)
*   is\_active (optional, boolean)

Response: 201 CreatedReturns created schedule.

### Get schedule

GET /schedules/{id}
*   Must enforce ownership.Response: 200 OK or 404 Not Found

### Update schedule

PUT /schedules/{id}
*   Must enforce ownership.
*   Allows updating type/payload/starts\_at/ends\_at/is\_active.Response: 200 OK

### Deactivate schedule

DELETE /schedules/{id}
*   Logical deletion: set is\_active=false (do not hard delete).Response: 200 OK with message or 204 No Content.

Resource Shape (Response)
-------------------------

Schedule resource JSON:
*   id
*   user\_id
*   medication\_id
*   type
*   payload
*   starts\_at
*   ends\_at
*   is\_active
*   created\_at
*   updated\_at

Note: payload should be returned exactly as stored.

Ownership / Security Requirements
---------------------------------
*   Any access to a schedule must ensure: schedule.user\_id == authenticated user id.
*   When creating a schedule:
    *   medication\_id must exist AND belong to the authenticated user.
    *   user\_id is set from auth context.
*   Prefer returning 404 when ownership fails (avoid leaking resource existence).

Implementation Plan (Backend)
-----------------------------

1.  Migration + Model
*   Create Schedule model and migration.
*   Add relationships:
    *   User hasMany Schedules
    *   Medication hasMany Schedules
    *   Schedule belongsTo User and Medication
*   Add casts:
    *   payload => array
    *   is\_active => boolean
    *   starts\_at/ends\_at => datetime (optional)

1.  Controller + Routes
*   Create ScheduleController with methods:
    *   index, store, show, update, destroy
*   Register routes under auth middleware.

1.  Validation
*   Use controller validation (FormRequests optional; may be added later).
*   Validate payload structure according to type.

1.  Manual testing via Insomnia
*   Use token-based authorization.

Insomnia Test Guide
-------------------

Headers for all requests:
*   Accept: application/json
*   Authorization: Bearer
*   Content-Type: application/json (POST/PUT)

1.  Create a medication (if none exists)POST /medicationsBody:
*   name: Vitamin D
*   dosage: 1 pill
*   instructions: After breakfast
*   is\_active: true

1.  Create a daily schedulePOST /schedulesBody example:
*   medication\_id:
*   type: daily
*   payload: { "times": \["08:00", "20:00"\] }

Expected: 201 + schedule JSON

1.  List schedulesGET /schedulesExpected: 200 + array with the created schedule
2.  Update schedulePUT /schedules/Body example:
*   payload: { "times": \["09:00"\] }

Expected: 200 + updated schedule

1.  Deactivate scheduleDELETE /schedules/Expected: 200 (or 204). Schedule becomes is\_active=false.
2.  List schedules (default)GET /schedulesExpected: does NOT include inactive schedule
3.  List schedules including inactiveGET /schedules?include\_inactive=trueExpected: includes the inactive schedule

Acceptance Criteria
-------------------
*   Schedules can be created, listed, updated, and deactivated for authenticated users.
*   medication ownership is enforced at creation time.
*   schedule ownership is enforced on show/update/delete.
*   Default list excludes inactive schedules, with an option to include them.
*   All responses are JSON and follow consistent HTTP codes (200/201/404/401/422).

Notes / Next Steps
------------------
*   SCHED-2 will implement a recurrence engine to compute upcoming dose instances based on schedule type and user timezone.
*   REM-1 will integrate local notifications in the mobile app using derived dose instances.
