# Local Creator Showcase & Commission Platform

![CI](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci.yml/badge.svg)

A web platform where local artists, photographers, craftspeople and digital artists
showcase portfolios, and visitors can request custom work (commissions).

University project, CMIS 3124 – Web Designing & E-Commerce, Group 12 (Topic 9).

## Roles

- **Visitor / Client**: browse portfolios, request commissions, leave reviews
- **Creator**: manage profile and portfolio, accept, reject or complete requests
- **Admin**: approve creators, block users, hide reviews

## Features

- Registration and role-based login (bcrypt password hashing, server-side validation)
- Homepage with carousel, category cards and featured creators
- Creator directory with category and location filters
- Creator profiles with portfolio, average rating and reviews
- Secure image upload (type, size and file-signature checks)
- Commission requests with a status workflow (pending, accepted, rejected, completed)
- Reviews and ratings after completed commissions
- Admin panel with moderation tools
- Responsive, accessible interface (Bootstrap 5)

## Tech stack

HTML5, CSS3, Bootstrap 5, vanilla JavaScript · Node.js, Express, EJS · MySQL ·
Jest and Supertest · GitHub Actions

## Setup

1. Install Node.js 18+ and MySQL.
2. Install packages: `npm install`
3. Create the database: `mysql -u root -p < database/schema.sql`
4. Copy `.env.example` to `.env` and fill in your MySQL details and a long random `SESSION_SECRET`.
5. Create an admin account: `node scripts/createAdmin.js admin@example.com YourStrongPassword`
6. (Optional) Add demo data: `node scripts/seedDemo.js` (remove it with `--reset`).
   All demo accounts use the password `Demo12345`, for example `nimali@demo.test` (creator)
   and `amal@demo.test` (client).
7. Start the server: `npm run dev` and open http://localhost:3000

## Tests

```bash
npm test
```
Jest and Supertest with mocked repositories (no database needed). GitHub Actions
runs the tests on every push.

## Project structure

```
app.js / server.js   App setup and server start
config/              Database connection
routes/              URL definitions
controllers/         Request handling
repositories/        All SQL queries
middleware/          Auth, role checks, validation, uploads, session refresh
views/               EJS pages and partials
public/              CSS, JS, images, uploads
database/            schema.sql
scripts/             createAdmin.js, seedDemo.js
tests/               Automated tests
```

## Security highlights

- Passwords hashed with bcrypt; one generic login error message
- Parameterized SQL only; LIKE wildcards escaped
- Output escaped in templates (XSS); status messages come from fixed lists
- Role middleware on whole routers; ownership checked inside SQL; user id from the session
- Upload checks: file type, 2 MB limit, random file names, real file signature, 20 works per creator
- Blocked users are logged out on their next request; admins cannot be blocked

## Known limitations

No CSRF tokens (reduced by SameSite cookies and POST-only changes), images stored on
local disk, in-memory sessions, no email notifications or payments.
See `NOTES.md` for the design decisions.