# Local Creator Showcase & Commission Platform

A web platform where local artists, photographers and craftspeople showcase
their portfolios and visitors can request custom work (commissions).

University project, Topic 9.

## Roles

- **Visitor / Client**: browse portfolios, request commissions, leave reviews
- **Creator**: manage portfolio, accept or reject commission requests
- **Admin**: approve creators, moderate content, manage users

## Tech Stack

- HTML + CSS (+ small vanilla JavaScript)
- Node.js + Express
- EJS (server-side templates)
- MySQL

## Setup

1. Install Node.js (v18+) and MySQL.
2. Clone the repository and install packages:
```bash
   npm install
```
3. Create the database:
```bash
   mysql -u root -p < database/schema.sql
```
4. Copy `.env.example` to `.env` and fill in your MySQL password.
5. Start the server:
```bash
   npm run dev
```
6. Open http://localhost:3000

## Project Structure

```
app.js              Entry point
config/             Database connection
routes/             URL definitions
controllers/        Request handling
repositories/       All SQL queries
middleware/         Auth, role checks, uploads, validation
views/              EJS pages and partials
public/             CSS, JS, images, uploads
database/           schema.sql
```

## Status

Work in progress.