# Test Cases

## Authentication

- Register with valid first name, last name, email, and strong password.
- Reject duplicate verified email.
- Reject weak password.
- Verify registration OTP.
- Reject expired or invalid OTP.
- Login with valid credentials.
- Reject invalid credentials.
- Refresh access token with refresh token.
- Logout invalidates refresh token.
- Forgot password sends reset OTP.
- Reset password invalidates old refresh tokens.

## User Management

- Admin lists users with pagination.
- Admin filters users by role.
- Admin upgrades USER to INSPECTOR.
- Non-admin cannot change roles.
- Admin soft deletes user.

## Fire Extinguishers

- Admin creates extinguisher.
- Reject missing serial number.
- Reject invalid dates.
- List supports page, limit, search, sort, status, and type.
- Admin updates extinguisher.
- Admin soft deletes extinguisher.

## Inspections

- Admin schedules inspection and assigns inspector.
- Reject non-inspector assignment.
- Inspector sees assigned inspections.
- Inspector completes assigned inspection.
- Status updates to COMPLETED.

## Maintenance

- Inspector creates maintenance log.
- List supports pagination and search.
- Admin soft deletes maintenance log.

## Reports

- Generate inventory report.
- Generate inspection report.
- Generate compliance report.
- Generate maintenance report.
- Export CSV.
- Export PDF.

## Security

- Protected endpoints reject missing JWT.
- Role-protected endpoints reject unauthorized roles.
- Rate limiter blocks excessive requests.
- CORS rejects unapproved origins.
- Validation returns standardized errors.
