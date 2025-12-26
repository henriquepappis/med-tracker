# INFRA-1 — Backend CI Hardening

## Goal
Ensure backend code quality through automated CI checks.

## Scope
- Lint (PHP Pint)
- Static analysis (PHPStan)
- Run tests on PRs
- Fail pipeline on errors

## Constraints
- CI must run on GitHub Actions
- No deployment in this phase

## Acceptance Criteria
- PRs fail if lint/tests fail
- CI runs automatically on pull requests
