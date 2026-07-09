# Bug Tracking System

A full-stack MERN bug and issue tracking platform with multi-tenant company support, real-time updates, subscription billing, and admin security tooling.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, Vite, React Router, Tailwind CSS 4, Recharts, Socket.IO Client |
| **Backend** | Node.js, Express, MySQL (Sequelize), Socket.IO, JWT, Multer |
| **Database** | MySQL |

## Features

### Core Bug Tracking
- Create and manage tickets (bugs, tasks, features, improvements, epics)
- Priority levels, workflow statuses, assignees, due dates, and time estimates
- Project-scoped ticket lists with saved filters
- Comments with @mentions and file attachments
- Real-time ticket updates via Socket.IO

### Client Portal & Issue Reporting
- Dedicated Client Portal dashboard for external clients to view and track their reported items
- Submit project issues with a title, description, and optional screenshot image attachments
- Real-time conversion of client reports to standard backlog tickets (Admins & Project Heads)
- Automatic mapping of client issue images to standard ticket attachments

### Multi-Tenant Organization
- Company registration and onboarding flow
- Role-based access: **Super Admin**, **Admin**, **Employee**, **Client**
- User directories for managing employee and client directory directories (invite, view details, activate/disable status)
- Project creation with flexible team membership controls for employees and clients

### Dashboards & Analytics
- Role-specific dashboards (Admin, Employee, Client)
- Ticket metrics, charts, and recent activity
- Project-level dashboard panels
- Live dashboard refresh over WebSockets

### Notifications
- In-app notification bell with unread count
- Real-time delivery via Socket.IO user rooms
- Events for assignments, mentions, status changes, and more

### SaaS & Billing
- Subscription plans (Free, Pro) with usage limits
- Usage tracking for projects, employees (excluding clients), storage, and monthly tickets
- Billing page with plan summary and upgrade prompts

### Security & Audit
- JWT authentication with session tracking
- Account lockout after failed login attempts
- Active session management and revocation
- Audit log for sensitive actions
- Security dashboard with failed-login trends (Admin only)
- Redis rate limiter startup timeout (graceful 5s connection check fallback to Memory limiting)

### Platform Admin
- Super Admin SaaS dashboard for cross-company oversight

## Project Structure

```
BugTrackingSystem/
├── Backend/
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Auth, upload, confirmation
│   ├── models/          # Sequelize models
│   ├── config/          # Database configuration
│   ├── routes/          # Express route definitions
│   ├── services/        # Business logic (notifications, billing, audit, etc.)
│   ├── uploads/         # Uploaded attachments (created at runtime)
│   └── server.js        # Entry point (HTTP + Socket.IO)
└── frontend/
    └── Bug-report-system/
        └── src/
            ├── components/  # UI, layout, feature components
            ├── context/       # React context (notifications)
            ├── hooks/         # Custom hooks
            ├── pages/           # Route pages
            └── utils/           # API helpers
```

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [MySQL](https://www.mysql.com/) 8+ running locally or a remote instance

Create the database before starting the backend:

```sql
CREATE DATABASE bug_tracker;
```

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd BugTrackingSystem
```

### 2. Backend setup

```bash
cd Backend
npm install
```

Create a `.env` file in the `Backend` directory:

```env
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=bug_tracker
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key_here
```

Start the backend:

```bash
npm run dev
```

The API runs at `http://localhost:5000`. On first startup with an empty database, seed data is created automatically.

### 3. Frontend setup

In a separate terminal:

```bash
cd frontend/Bug-report-system
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

## Default Seed Credentials

When the database is empty, the backend seeds the following accounts:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `superadmin@example.com` | `SuperAdmin@123` |
| Admin | `admin@example.com` | `Admin@123` |
| Employee | `employee@example.com` | `Employee@123` |

The seeded company is **Citizens Foundation** with a Free plan subscription.

## API Overview

All protected routes require a `Bearer` token in the `Authorization` header.

| Prefix | Description |
|--------|-------------|
| `/api/login`, `/api/register`, `/api/me` | Authentication |
| `/api/company` | Company management |
| `/api/users` | User / employee management |
| `/api/projects` | Projects and members |
| `/api/tickets` | Ticket CRUD and workflow |
| `/api/notifications` | Notifications |
| `/api/mentions` | @mention handling |
| `/api/saved-filters` | Saved ticket filters |
| `/api/dashboard` | Dashboard metrics |
| `/api/subscription`, `/api/plans` | Billing and plans |
| `/api/audit-logs` | Audit trail |
| `/api/sessions` | Session management |
| `/api/security` | Security metrics |
| `/api/client-issues` | Client issue reporting and conversion |

Static uploads are served at `/uploads`.

## Real-Time Events (Socket.IO)

The backend shares the same port for REST and WebSockets. Clients authenticate with the JWT in the handshake (`auth.token`).

| Event | Description |
|-------|-------------|
| `join:ticket` / `leave:ticket` | Subscribe to live ticket updates |
| `join:project` / `leave:project` | Subscribe to project-level events |
| `join:company` | Subscribe to company-wide dashboard updates |
| `notification:new` | New in-app notification |
| `ticket:updated` | Ticket changed on a subscribed ticket |

## User Roles

| Role | Access |
|------|--------|
| **SUPER_ADMIN** | Platform SaaS dashboard; no company required |
| **ADMIN** | Full company access: employees, clients, security, billing, projects, tickets |
| **EMPLOYEE** | Projects, tickets, and clients directory access |
| **CLIENT** | Limited external portal access: view assigned projects, report issues (with screenshots), and track conversion to tickets |

## Scripts

**Backend** (`Backend/`)

| Command | Description |
|---------|-------------|
| `npm start` | Run production server |
| `npm run dev` | Run with nodemon (hot reload) |

**Frontend** (`frontend/Bug-report-system/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## License

This project is for educational and development use.
