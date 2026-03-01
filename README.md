# PasumaiHub v2.0 - Complete Rewrite

A modern farmers marketplace platform, rebuilt from scratch with a proper backend and modern frontend.

## What's New (vs original)

| Old Version | New Version |
|-------------|-------------|
| Static HTML | Express.js backend |
| localStorage "auth" | JWT + bcrypt |
| No database | SQLite database |
| Insecure | Password hashing, protected routes |
| Basic UI | Modern SPA with Inter font |

## Features

- **User Authentication** - Register/Login with secure JWT tokens
- **Roles** - Farmer and Buyer roles
- **Marketplace** - Browse and search products
- **Product Management** - Create, edit, delete your listings
- **Transactions** - Buy products, track sales/purchases
- **Dashboard** - View stats (products, sales, revenue)

## Quick Start

### Using Docker (Recommended)

```bash
# Build
docker build -t pasumaihub .

# Run
docker run -d -p 9999:9999 pasumaihub
```

### Local Development

```bash
# Install dependencies
npm install

# Start server
npm start
```

Open http://localhost:9999

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** SQLite (better-sqlite3)
- **Auth:** JWT, bcryptjs
- **Frontend:** Vanilla JS, Inter font

## Project Structure

```
pasumaihub/
├── server.js          # Express backend
├── public/
│   └── index.html     # Frontend SPA
├── package.json
├── Dockerfile
└── pasumaihub.db      # SQLite database (created on first run)
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login user |
| GET | /api/auth/me | Get current user |
| GET | /api/products | List all products |
| GET | /api/products/my | List user's products |
| POST | /api/products | Create product |
| PUT | /api/products/:id | Update product |
| DELETE | /api/products/:id | Delete product |
| POST | /api/transactions | Create transaction |
| GET | /api/transactions | List user transactions |
| GET | /api/stats | Get dashboard stats |

## Sending to Original Creator

To create a pull request:

1. Go to https://github.com/dhanum461-dev/pasumaihub1
2. Click **Fork**
3. Upload these files to your fork:
   - `server.js`
   - `public/index.html`
   - `package.json`
   - `Dockerfile`
   - `.gitignore`
4. Click **Contribute** → **Open pull request**

## Screenshots

- Modern login/register with tab switching
- Green gradient branding (farm aesthetic)
- Clean dashboard with stats cards
- Product marketplace with search
- Transaction history

## License

MIT
