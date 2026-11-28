# LCC Merchandise System

## Run locally

From the project root:

```bash
npm run dev
```

This starts all four services together:

- Client: http://localhost:5173
- Express API: http://localhost:5000
- QR service: http://localhost:8000
- Analytics service: http://localhost:8001

The client points each service at the hostname used to open the page, so it
works on `localhost`, `127.0.0.1`, or a LAN IP without editing source files.

To target different machines, copy `client/.env.example` to `client/.env` and
set `VITE_API_URL`, `VITE_QR_URL`, and `VITE_ANALYTICS_URL`.

## Database

The API expects XAMPP MariaDB running on port 3306 with database
`lcc_merchandise` and the credentials in `server/.env`.

Apply new migrations in `server/database/migrations/` to the database as they
are added. `004_add_user_profile_picture.sql` adds the `users.profile_picture`
column used by the student profile page.
