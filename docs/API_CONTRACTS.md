# API Contracts

Base URL: `http://localhost:3000`

All protected endpoints require:

```http
Authorization: Bearer ACCESS_TOKEN
X-CSRF-Token: csrfTokenCookieValue
```

## Authentication

- `POST /auth/register` creates a USER account and sends registration OTP.
- `POST /auth/verify-otp` verifies registration OTP and returns `accessToken` plus `refreshToken`.
- `POST /auth/login` authenticates email/password and returns tokens.
- `POST /auth/refresh` rotates refresh token and returns a new access token.
- `POST /auth/logout` revokes refresh tokens.
- `POST /auth/forgot-password` sends password reset OTP.
- `POST /auth/reset-password` resets password using OTP.
- `POST /auth/change-password` changes password for authenticated users.

## User Management

- `GET /users?page=&limit=&search=&sort=&role=` lists users.
- `POST /users` creates a verified user as admin.
- `GET /users/:id` views one user.
- `PUT /users/:id` updates profile fields or admin-upgrades role to `INSPECTOR`.
- `DELETE /users/:id` soft deletes a user.

## Fire Extinguishers

- `GET /extinguishers?page=&limit=&search=&sort=&status=&type=` lists inventory.
- `POST /extinguishers` creates inventory.
- `GET /extinguishers/:id` views details.
- `PUT /extinguishers/:id` updates inventory.
- `DELETE /extinguishers/:id` soft deletes inventory.

## Inspections

- `GET /inspections?page=&limit=&search=&sort=&status=` lists inspections.
- `POST /inspections` schedules and assigns an inspector.
- `PUT /inspections/:id/status` updates status.
- `POST /inspections/:id/complete` creates an inspection result.

## Maintenance

- `GET /maintenance?page=&limit=&search=&sort=&extinguisherId=` lists history.
- `POST /maintenance` creates a log.
- `GET /maintenance/:id` views one log.
- `DELETE /maintenance/:id` soft deletes a log.

## Reports

- `GET /reports/inventory`
- `GET /reports/inspection`
- `GET /reports/compliance`
- `GET /reports/maintenance`
- `GET /reports/export.csv?type=INVENTORY`
- `GET /reports/export.pdf?type=INVENTORY`

## Notifications

- `GET /notifications?page=&limit=&search=&sort=&status=`
- `POST /notifications/respond/:id`
- `POST /notifications/trigger-check`
