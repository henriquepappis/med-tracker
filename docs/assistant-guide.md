# Assistant Guide — Med Tracker

This document defines **mandatory rules** for any code generated or modified with AI in this repository.

It is the **single source of truth** for how the project must be structured, implemented, and evolved.

---

## Purpose

Enable **AI-driven development** with consistency, predictability, and architectural integrity.

The AI acts as an **implementer**.
The human acts as **architect and reviewer**.

---

## Repository Structure (immutable)

The following structure MUST be respected:

- Mobile app: `apps/mobile`
- Backend API: `apps/api`
- Infrastructure: `docker`
- Documentation: `docs`

❌ Never mix responsibilities between mobile and API
❌ Never create application code outside these directories

---

## Architecture as Source of Truth

Before implementing any feature, the AI MUST:

1. Read `docs/architecture.md`
2. Check existing ADRs in `docs/adr/`

If a task does not clearly fit the current architecture:
➡️ create or update an ADR **before writing code**.

Architecture decisions must be explicit and versioned.

---

## Mobile Rules (React Native)

### Stack
- React Native (Expo)
- TypeScript
- Feature-based structure
- Zustand for global state
- TanStack Query for data fetching
- React Hook Form + Zod for forms

### Folder structure (per feature)
- features/<feature-name>/
- components/
- screens/
- hooks/
- services/
- types/


### Mandatory practices
- Business logic must live in **pure functions**
- No API calls directly inside UI components
- Explicit typing (no `any`)
- Unit tests for any non-trivial logic
- Internationalization via i18n (no hardcoded user-facing strings)

---

## Backend Rules (Laravel API)

- Controllers must be thin
- Business logic belongs to Services
- Input validation via FormRequest
- Authorization via Policies
- Stateless REST API
- API responses in JSON only

Any change to API contracts must be reflected in OpenAPI documentation.

---

## Testing (Mandatory)

- Any business logic MUST have tests
- Tests must run locally before commit
- UI-only code may skip tests if justified

AI-generated code without tests is considered incomplete.

---

## Development Flow (per issue)

1. Read the Issue
2. Review `docs/architecture.md`
3. Review relevant ADRs
4. Propose a **file-level plan**
5. Implement in small, focused steps
6. Write tests
7. Run tests locally
8. Commit

---

## Standard Prompt Template (recommended)

When asking AI to implement a task, always start with:

> Implement issue `<ISSUE_ID>` following strictly:
> - `docs/assistant-guide.md`
> - `docs/architecture.md`
> - existing ADRs
>
> First provide:
> 1. File and folder plan
> 2. Code implementation
> 3. Tests
> 4. Validation steps

---

## Commit Message Convention

Use a simplified Conventional Commits pattern:

- `chore:` infrastructure, config, tooling
- `feat:` new functionality
- `fix:` bug fixes
- `docs:` documentation
- `test:` tests only

Example:

---

## Pull Requests

All PRs must:
- Reference a related issue
- Explain **what** and **why**
- Include validation steps
- Respect architectural boundaries

The PR template must be followed.

---

## Prohibited Practices

❌ Writing code without understanding the architecture
❌ Mixing responsibilities between layers
❌ Adding abstractions without justification
❌ Changing architecture without ADR
❌ Hardcoding user-facing strings
❌ “Quick fixes” without tests

---

## Final Rule

If a conflict arises between:
- speed vs architecture
- convenience vs consistency

➡️ **Architecture and consistency always win.**
