System Architecture
===================

Overview
--------

This project is a **mobile-first medication tracking system** built as a **monorepo**, with a Laravel backend API and a React Native mobile application.

The architecture prioritizes:
*   clear domain boundaries
*   simple REST APIs
*   token-based authentication
*   extensibility for scheduling and notifications
*   AI-assisted development with strict architectural constraints

Monorepo Structure
------------------
*   apps/apiLaravel 12 REST API (authentication, domain logic, persistence)
*   apps/mobileReact Native (Expo) application (UI, local notifications, offline support)
*   docsArchitecture documentation, ADRs, and implementation specifications

Backend Architecture (apps/api)
-------------------------------

### Framework
*   Laravel 12
*   PHP 8.2+
*   RESTful API design
*   Stateless authentication using Laravel Sanctum (API tokens)

### Authentication
*   Token-based authentication only
*   No cookie or session-based auth
*   All protected routes must use auth:sanctum
*   Tokens are issued per device/session

Domain Design
-------------

### Core Domains
*   UserAuthentication, profile preferences (timezone, language)
*   MedicationUser-owned medications
*   ScheduleUser-defined schedules linked to medications
*   Intake (future)Records of taken/skipped doses

### Ownership Rules
*   Every domain entity belongs to a user
*   User identity is always derived from the authenticated request
*   user\_id is never accepted from client input
*   Ownership violations must return 404 (not 403) to avoid resource leakage


API Design Principles
---------------------
*   JSON-only responses
*   No HTML responses
*   Proper HTTP status codes (200, 201, 401, 404, 422)
*   Validation errors must return structured JSON
*   No server-side rendering


Deletion Strategy
-----------------
*   Logical deletion is preferred for domain entities
*   Use is\_active=false instead of hard deletes
*   Records are only hard-deleted if explicitly required


Database
--------
*   PostgreSQL
*   Migrations are the source of truth
*   No manual schema changes
*   Relationships enforced with foreign keys

Time and Localization
---------------------
*   All timestamps stored in UTC
*   User timezone is stored in user profile
*   Localization handled at the client level (mobile app)
*   Backend remains language-agnostic

AI-Assisted Development Rules
-----------------------------
When using AI tools (Cursor, Codex):
*   AI must follow this document strictly
*   AI must read existing code before generating new code
*   AI must not introduce new layers or patterns without justification
*   Changes should be incremental and reviewable
*   Specifications in docs/spec/\*.md override defaults

Diagrams
--------
High-level flow diagrams and sequence diagrams may be added using Mermaid when useful, but diagrams are supplementary and not mandatory.

Status
------
This document defines the **current authoritative architecture** of the system and must be updated if core decisions change.
