# Fire Extinguisher Management System

A RESTful microservices application for managing fire extinguisher inventory, inspections, maintenance, compliance alerts, users, and reports.

## Current Architecture

```text
React Frontend -> API Gateway -> Microservices -> PostgreSQL

Microservices:
- Auth Service
- User Service
- Fire Extinguisher Service
- Inspection Service
- Maintenance Service
- Reporting Service
- Notification Service
```

The project is being rebuilt incrementally from an existing starter project. The current baseline keeps the Vite React JavaScript frontend while backend services are being expanded toward the required enterprise microservice architecture.

## Tech Stack

- Frontend: React, JavaScript, Vite, Tailwind CSS, Axios
- Backend: Node.js, Express.js, Prisma ORM
- Database: PostgreSQL
- Auth: JWT, bcrypt, OTP email verification
- Security: Helmet, CORS, role guards, input validation
- Logging: Winston
- API Docs: Swagger UI at `/api-docs`

## Service Ports

| Service | URL |
| --- | --- |
| Frontend | `http://localhost:5173` |
| API Gateway | `http://localhost:3000` |
| Swagger Docs | `http://localhost:3000/api-docs` |
| Auth Service | `http://localhost:3001` |
| User Service | `http://localhost:3002` |
| Fire Extinguisher Service | `http://localhost:3003` |
| Inspection Service | `http://localhost:3004` |
| Maintenance Service | `http://localhost:3005` |
| Reporting Service | `http://localhost:3006` |
| Notification Service | `http://localhost:3007` |

## Prerequisites

- Node.js 18+
- npm
- PostgreSQL running locally

Docker is intentionally not used in this project.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create the environment file:

```bash
copy .env.example .env
```

3. Update `DATABASE_URL` in `.env` with your local PostgreSQL credentials.

4. Create the database in PostgreSQL:

```sql
CREATE DATABASE fire_extinguisher_db;
```

5. Generate Prisma client and push the schema:

```bash
npm run db:generate
npm run db:push
```

6. Start the application:

```bash
npm run dev
```

## Core Workflows

- Register with first name, last name, email, and password.
- Verify registration using an OTP sent by email.
- Login with JWT authentication.
- Manage users with ADMIN, INSPECTOR, and USER roles.
- Register and monitor fire extinguisher inventory.
- Schedule inspections and assign inspectors.
- Complete inspections and store inspection results.
- Log maintenance actions and recommendations.
- Generate inventory, inspection, compliance, and maintenance reports.
- Send notification emails for expiry and compliance events.

## API Groups

- `/auth` - registration, OTP verification, login, profile
- `/users` - user management
- `/extinguishers` - fire extinguisher inventory
- `/inspections` - inspection scheduling and completion
- `/maintenance` - maintenance logs
- `/reports` - reporting and CSV export
- `/notifications` - notification listing, responses, and expiry checks

## Default Admin

The auth service seeds a default admin account on startup.

| Field | Value |
| --- | --- |
| Email | `admin@gmail.com` |
| Password | `Admin@123` |

Override these values in `.env`:

```env
ADMIN_EMAIL="admin@gmail.com"
ADMIN_PASSWORD="Admin@123"
ADMIN_NAME="System Admin"
```

## Documentation Deliverables In Progress

The following project artifacts are part of the target deliverables and will be added as the rebuild continues:

- ERD
- API contracts
- Postman collection
- Deployment guide
- User manual
- Test cases
- Seed scripts
