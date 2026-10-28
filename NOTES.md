# Project Notes

Decision log. Each entry explains WHY a choice was made (useful for the viva).

## Decisions

- **Server-rendered EJS instead of React**: the assignment requires HTML + CSS,
  and server rendering is simpler to build solo and easier to explain.
- **MySQL (relational)**: data is highly relational (users, commissions, reviews).
- **bcryptjs instead of bcrypt**: pure JS, no native build problems on Windows.
- **Session cookies instead of JWT**: simpler and secure enough for a server-rendered app.
- **commission_requests.creator_id references creator_profiles.id**: the database
  itself guarantees only creators can receive commissions.
- **reviews.commission_id is UNIQUE**: one review per completed commission.
- **Architecture**: MVC + Repository pattern (SQL only inside repositories/).
- **Validation on the server (express-validator)**: browser checks can be bypassed.
- **Admin cannot self-register**: role list in the form excludes 'admin'; admin is
  created by scripts/createAdmin.js.
- **Generic login error**: same message for wrong email or password (prevents user enumeration).
- **session.regenerate on login**: prevents session fixation.
- **Logout is POST + sameSite=lax cookie**: basic CSRF protection.
- **Known limitation**: no CSRF tokens (out of scope for this project, can mention in viva).
- **Bootstrap 5 via CDN**: course syllabus includes Bootstrap; gives responsive grid,
  navbar and carousel with little custom CSS. React deliberately postponed: solo, 2-4 weeks.
  Backend (repositories/middleware) is kept independent so React can be added later
  (controllers would return JSON instead of rendering EJS).
- **Public queries filter is_approved = 1 and is_active = 1**: unapproved or blocked
  creators never appear publicly.
- **Ratings are calculated with AVG(), not stored**: cannot go out of sync.
- **Promise.all on the homepage**: independent queries run in parallel.
- **Empty states on every section**: page works on a fresh database.
- **Dynamic search WHERE built from fixed strings; values via ? placeholders**: filters
  without SQL injection. LIKE wildcards (% and _) are escaped.
- **findById returns null for unapproved/blocked creators**: profile URLs cannot be guessed.
- **Real 404 page + id validation (parseInt)**: bad URLs never reach the database.
- **Reusable creator-card partial**: one template for home, directory and category pages.
- **Jest + Supertest instead of pytest**: pytest is Python-only; Jest is the standard
  for Node. Repositories are mocked so tests need no database and run in CI.
- **app.js / server.js split**: app.js exports the app; server.js starts listening.
  Needed so tests can import the app without opening a port.
- **GitHub Actions**: runs `npm ci` and `npm test` on every push and pull request.
- **Uploads: random file names, extension from a server-side map, 2 MB limit, magic-byte
  check**: the browser's Content-Type and file name can be faked, so file contents are verified.
- **Failed requests delete their uploaded files**: no orphan images.
- **Ownership check inside the SQL (AND creator_id = ?)** and creator id taken from the
  session: a creator cannot touch another creator's work even by editing the form.
- **router.use(requireRole('creator'))**: one line protects the whole creator router.
- **Max 20 works per creator**: bounds storage.
- **Known limitation**: images are stored on local disk (not cloud storage); fine for this project.

## Scope

- MVP: auth, creator portfolio, categories, commission requests, reviews, admin approval.
- Out of scope: payments, real-time chat, email notifications.

## Progress Log

- [x] Project setup, schema, server skeleton
- [x] Register / Login
- [x] Navbar + Homepage + Categories page
- [x] Creator directory, profile page, category pages
- [x] Tests (Jest + Supertest) and CI (GitHub Actions)
- [x] Creator dashboard + portfolio upload (with tests)
- [ ] Commission requests
- [ ] Reviews
- [ ] Admin dashboard
- [ ] Final testing + viva preparation