# Field Service Scheduler

Desktop application for managing field technician dispatches, built with Angular 18 + Electron + SQLite.

## Features

- **Service Requests** — full CRUD with status flow: `new` → `scheduled` → `in progress` → `done` → `closed`
- **Dashboard** — live stats: open requests, active technicians, completion rate
- **Audit Log** — every create / update / delete operation is logged automatically
- **CSV Export** — native save dialog via Electron IPC
- **Multi-language UI** — English, Українська, Deutsch (switchable without reload)
- **Dark / Light theme** — persisted in localStorage
- **System Tray** — app stays in tray when window is closed

## Tech Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Frontend  | Angular 18, Angular Material 18         |
| Desktop   | Electron 33                             |
| Database  | SQLite via `better-sqlite3`             |
| IPC       | contextBridge + ipcMain/ipcRenderer     |

## Project Structure

```
Field-Service-Scheduler/
├── main.js              # Electron main process
├── preload.js           # contextBridge → window.api
├── src/
│   ├── database.js      # SQLite init & seed
│   └── handlers/        # IPC handlers (requests, audit, refs, export)
├── fe/                  # Angular frontend
│   └── src/app/
│       ├── core/        # services, models, i18n
│       ├── layout/      # header, sidebar
│       ├── pages/       # dashboard, requests, audit-log, settings
│       └── shared/      # pipes, components
└── db/
    └── schema.sql       # database schema
```

## Getting Started

### Prerequisites

- Node.js 18+
- Windows (native `better-sqlite3` build)

### Install

```bash
npm run setup
```

> This runs `npm install --ignore-scripts` and then rebuilds `better-sqlite3` for the correct Electron ABI.

### Run (development)

```bash
npm run dev
```

Starts Angular dev server on `http://localhost:4200` and opens Electron pointing to it.

### Run (production build)

```bash
npm run fe:build
npm start
```

### Database

SQLite file is stored at:
```
%APPDATA%\Field-Service-Scheduler\fss.db
```

Created and seeded automatically on first launch.

## License

MIT
