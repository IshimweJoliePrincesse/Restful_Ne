# Fire Extinguisher Management System Design System

This document is the UI/UX source of truth for the Fire Extinguisher Management System. The interface must feel professional, modern, responsive, and appropriate for industrial safety operations.

## Theme

- Primary color: safety red (`#dc2626`)
- Secondary colors: white (`#ffffff`) and industrial greys (`#f8fafc`, `#e5e7eb`, `#6b7280`, `#111827`)
- Visual tone: clean safety dashboard, compliance-focused, mobile first, high contrast
- Layout style: protected application shell with sidebar navigation on desktop and stacked navigation on mobile
- Interaction style: clear confirmations for add, update, delete, and logout actions

## Color Roles

- `--color-primary`: `#dc2626` for primary actions, active navigation, destructive emphasis, and safety highlights.
- `--color-primary-dark`: `#991b1b` for hover and pressed states.
- `--color-bg`: `#f8fafc` for the application background.
- `--color-surface`: `#ffffff` for cards, forms, tables, dialogs, and panels.
- `--color-border`: `#e5e7eb` for card borders and table separators.
- `--color-text`: `#111827` for headings and primary text.
- `--color-muted`: `#6b7280` for helper text and metadata.
- `--color-success`: `#16a34a` for completed and compliant states.
- `--color-warning`: `#f59e0b` for pending, near-expiry, and confirmation warnings.
- `--color-danger`: `#dc2626` for expired, overdue, failed, and destructive states.

## Typography

- Use a system sans-serif stack: `Inter`, `Segoe UI`, `Arial`, `sans-serif`.
- Page titles: 24-32px, 700 weight, tight line height.
- Section titles: 18-20px, 600 weight.
- Body text: 14-16px, 400-500 weight.
- Table headers: 12-14px, 600 weight, uppercase or muted sentence case.
- Helper text: 12-14px, muted grey.

## Components

### Buttons

- Primary buttons use red background, white text, 8-12px radius, and a darker red hover state.
- Secondary buttons use white background, grey border, dark text, and a light grey hover state.
- Destructive buttons use red text or red background depending on risk.
- Disabled buttons use reduced opacity and must not trigger actions.

### Forms

- Inputs are full width on mobile.
- Labels are always visible above controls.
- Validation errors appear directly below the field in red.
- Required fields must be clearly marked through labels or validation messages.
- Authentication forms are centered cards with clear headings and helper copy.

### Tables

- All data tables must support server-side pagination, search, sorting, and filtering.
- Desktop tables use compact rows with sticky or visible headers.
- Mobile views may scroll horizontally or collapse into cards.
- Empty states must explain what the user should do next.

### Toasts

Use Sonner Toast for all user feedback:

- Success: login, registration, OTP verification, password change, user creation, record creation, update, delete, inspection scheduling, and maintenance logging.
- Error: invalid credentials, validation failures, server errors, unauthorized access, and expired OTP.
- Warning: confirmation prompts for add, update, delete, and logout.

### Dashboards

- Admin dashboard: inventory counts, inspection status, compliance status, users, maintenance activity, and alerts.
- Inspector dashboard: assigned pending inspections, completed inspections, overdue inspections, and recent maintenance work.
- User dashboard: extinguisher status, inspection history, notifications, and compliance alerts.

## Page Requirements

The frontend must include:

- Login
- Register
- Verify OTP
- Forgot Password
- Reset Password
- Admin Dashboard
- Inspector Dashboard
- User Dashboard
- List/Create/Edit/Delete/View Users
- List/Add/Update/Delete/View Fire Extinguishers
- Schedule Inspection
- Inspection History
- Pending Inspections
- Completed Inspections
- Create Maintenance Log
- Maintenance History
- Inventory Reports
- Compliance Reports
- Inspection Reports
- Maintenance Reports
- Profile
- Change Password

## Responsive Behavior

- Mobile first layout.
- Sidebar collapses or stacks on small screens.
- Tables must remain readable through horizontal scroll or card layout.
- Forms use one column on mobile and two columns on tablet/desktop when space allows.
- Touch targets should be at least 44px tall where possible.

## Accessibility

- Maintain strong contrast between text and backgrounds.
- Use semantic buttons, labels, table headers, and headings.
- Do not rely on color alone for status; include text labels like `Pending`, `Completed`, `Overdue`, `Expired`, or `Compliant`.
- Confirmation dialogs must clearly state the consequence of the action.

## Do Not Use

- Do not use Starbucks-inspired green/cream branding.
- Do not use sales, shopping, purchase, or customer-store language.
- Do not use police escalation language.
- Do not use Docker-specific UI or setup guidance.
