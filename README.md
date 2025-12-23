# Med Tracker

Med Tracker is a mobile application for **medication management**, allowing users to register medications, configure dose schedules, receive reminders, record intakes, and analyze adherence reports.

This project is designed as a **professional engineering portfolio**, showcasing architecture decisions, clean code practices, mobile + backend integration, CI pipelines, and AI-assisted development workflows.

---

## Purpose

The application helps users **organize medication usage** through reminders and historical tracking.

> ⚠️ Disclaimer
> Med Tracker is **not a medical device** and does not provide medical advice, diagnosis, or treatment recommendations. It is intended solely as an organizational and reminder tool.

---

## Architecture Overview

The project is structured as a **monorepo**, separating responsibilities while keeping development cohesive.

### High-level components
- **Mobile App**: React Native (Expo) — UI, local scheduling logic, notifications, offline-first behavior
- **Backend API**: Laravel — authentication, persistence, reporting, synchronization
- **Infrastructure**: Docker (local), GitHub Actions (CI)

```
med-tracker/
├── apps/
│   ├── api/        # Laravel REST API
│   └── mobile/     # React Native (Expo)
├── docker/         # Docker Compose (API + DB)
├── docs/           # Architecture docs and ADRs
├── .github/
│   └── workflows/  # CI pipelines
└── README.md
```

Detailed architecture diagrams and decisions are documented in `docs/architecture.md` and `docs/adr/`.

---

## Technology Stack

### Mobile
- React Native
- TypeScript
- Expo
- React Navigation
- TanStack Query
- Zustand
- React Hook Form + Zod
- i18next (EN default, PT-BR supported)
- Expo Notifications

### Backend
- Laravel
- Sanctum (token-based authentication)
- MySQL or PostgreSQL
- REST API
- OpenAPI / Swagger
- PHPUnit / Pest

### Tooling & Quality
- Docker Compose
- GitHub Actions
- ESLint / Prettier
- PHP Pint / PHPStan

---

## Core Features

### Authentication
- User registration and login
- Token-based session management
- Timezone configuration

### Medications
- Create, update, delete medications
- Dosage and instructions

### Schedules
- Daily recurrence (multiple times per day)
- Weekly recurrence (specific days)
- Interval-based recurrence (e.g. every 8 hours)

### Reminders
- Local notifications
- Automatic rescheduling
- Quick actions: **Taken / Postpone / Skip**

### Intake Tracking
- Taken
- Postponed
- Skipped
- Missed (based on configurable heuristics)

### History & Reports
- Daily timeline
- Weekly and monthly adherence metrics
- Aggregated KPIs

### Offline Support (partial)
- Local cache
- Offline queue for intake actions with later synchronization

---

## Internationalization (i18n)

- **Default language**: English
- **Supported languages**: English (`en`), Portuguese Brazil (`pt-BR`)
- Language is automatically detected from the device and can be manually changed in Settings.

All UI strings are managed via `i18next`.
No hardcoded user-facing strings are allowed in the codebase.

---

## Local Development

### Prerequisites
- Node.js 18+
- PHP 8.2+
- Docker + Docker Compose
- Expo CLI

---

### Backend (API)

```bash
cd apps/api
cp .env.example .env
docker compose up -d
php artisan migrate --seed
php artisan serve
```

API available at:
```
http://localhost:8000/api
```

---

### Mobile App

```bash
cd apps/mobile
npm install
npm start
```

Run using:
- Expo Go (physical device)
- iOS / Android emulator

---

## Testing

### Backend
```bash
php artisan test
```

### Mobile
```bash
npm run lint
npm run typecheck
npm test
```

---

## CI / CD

The project uses **separate CI pipelines** for mobile and backend:

### Backend CI
- Dependency install
- Linting
- Automated tests

### Mobile CI
- Linting
- Type checking
- Tests

Pipelines are triggered automatically on Pull Requests.

---

## Documentation

- `docs/architecture.md` — system architecture and diagrams (Mermaid)
- `docs/adr/` — Architecture Decision Records
- API documentation via Swagger/OpenAPI

---

## Roadmap

- [x] Architecture and planning
- [ ] Monorepo bootstrap
- [ ] Authentication
- [ ] Medication management
- [ ] Scheduling and recurrence engine
- [ ] Notifications
- [ ] History and reports
- [ ] App Store (iOS) release

---

## Author

**Henrique Pappis**
Software Engineer
Recife, Brazil
GitHub: https://github.com/henriquepappis

---

## License

This project is licensed under the MIT License.

