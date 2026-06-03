# Deployment Guide

## Requirements

- Node.js 18+
- npm
- PostgreSQL
- SMTP account for OTP and notification email

## Database

Create the PostgreSQL database:

```sql
CREATE DATABASE fire_extinguisher_db;
```

Set `DATABASE_URL`:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5433/fire_extinguisher_db?schema=public"
```

Run:

```bash
npm install
npm run db:generate
npm run db:push
```

## Start Services

```bash
npm run dev
```

This starts gateway, auth, user, extinguisher, inspection, maintenance, reporting, notification, and frontend services.

Docker is not used.
