# CMPG311 Group 2 POS System

Full-stack POS system using Node.js, Express, PostgreSQL, and static HTML/CSS/JS frontend.

## Current features

- Online PostgreSQL database support through `DATABASE_URL`
- Customers registration and customer list database sync
- Sales page customer dropdown sync
- Dashboard counts from live API data
- Product management with inventory sync
- Same product name + same price increases stock quantity instead of creating duplicates
- Same name with different price creates a new product row
- Inventory overview reads from product + inventory tables
- ERD-aligned schema in `database_schema_render.sql`

## Run locally

```bash
npm install
npm start
```

Open:

```text
http://localhost:3000
```

## Environment

Copy `.env.example` to `.env` and set:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE_NAME
```

## Online deployment

See `ONLINE_DEPLOYMENT_GUIDE.md`.
