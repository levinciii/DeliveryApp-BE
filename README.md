# Delivery App - Backend (v0.1)

API for a multi-vendor delivery marketplace (customers, merchants, riders, admin). Plain **JavaScript**
(ES modules) with **Express 5**, **Prisma** and **PostgreSQL**. Same setup as the TaxIT backend.

## Project structure

```
server.js                 starts the HTTP server (listen + graceful shutdown)
nodemon.json              dev auto-reload settings
envs/.env.example         template for the real .env in the project root
src/
  app.js                  builds the Express app (helmet, cors, json, routes, error handling)
  config/                 env.js (validated environment), prisma.js (shared database client)
  routes/                 URL -> controller wiring, one file per feature (+ index.js)
  controllers/            thin HTTP layer: read req, call a service, send res
  services/               business logic and database access
  middlewares/            authenticate, requireRole, validate (Zod), rateLimit, errorHandler
  models/                 request validation schemas (Zod)
  shared/                 framework-free code: money, pagination, errors
  prisma/                 schema.prisma, seed.js, migrations/ (created by `prisma migrate dev`)
  generated/prisma/       generated Prisma client (git-ignored, rebuilt on `npm install`)
```

Request flow: `route -> middlewares (auth, validate) -> controller -> service -> Prisma`.

## 1. Database setup (PostgreSQL 16+, installed locally)

Create an empty database named `DeliveryApp` using your existing Postgres login (the `postgres` superuser works).

**Option A - psql / SQL Shell:**

```sql
CREATE DATABASE "DeliveryApp";
```

**Option B - pgAdmin:** right-click **Databases** > **Create** > **Database...**, set the name to `DeliveryApp`
and save.

Then put your own Postgres login in `DATABASE_URL` in `.env` (step 2):

```
DATABASE_URL=postgresql://USER:PASSWORD@localhost:7777/DeliveryApp
```

- `USER` / `PASSWORD` are the login you already use in pgAdmin (often `postgres`).
  If the password has special characters, URL-encode them (`@` becomes `%40`, `#` becomes `%23`).
- Use your own port (`5432` is the default; your local install uses `7777`).
- The login must be allowed to create databases (the `postgres` superuser is), because
  `prisma migrate dev` creates a temporary shadow database.
- **Coming from the earlier DeliveryApp backend?** That version created tables with a different layout
  (`roles`, `user_roles`, ...). Drop and recreate the `DeliveryApp` database (it only holds test data) before
  step 2. If you skip this, `prisma migrate dev` will offer to reset the schema; answer `y`.

## 2. Run it

```bash
npm install                    # also runs `prisma generate`
```

Create `.env` in the project root from the template (`cp envs/.env.example .env` on macOS/Linux,
`copy envs\.env.example .env` on Windows), then edit it:

- `DATABASE_URL`: your Postgres login and port (see above).
- `JWT_SECRET`: any random string of at least 32 characters. The server will not start without it.
- `ALLOWED_ORIGINS`: the web apps allowed to call the API. The default covers customer-web (5173) and admin-web (5174).
- Optional: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (see the seed step below).
- Optional: order pricing (`DELIVERY_BASE_FEE`, `DELIVERY_FEE_PER_KM`, `SERVICE_FEE`, `MAX_DELIVERY_KM`).
  The defaults are placeholders, not market rates.

```bash
npx prisma migrate dev --name init     # creates src/prisma/migrations/ and applies it
npx prisma db seed                     # product categories (+ an admin account if you set the SEED_ADMIN_* vars)
npm run dev                            # nodemon, http://localhost:3000/api
```

Check `http://localhost:3000/api/health` returns `{"status":"ok"}`.

**Pulling an update that changes the schema** (the orders update does): run `npx prisma migrate dev --name <what_changed>`
and commit the new folder in `src/prisma/migrations/`.

| Command | What it does |
|---|---|
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm start` | Start with plain node (production) |
| `npm test` | Run the unit tests (Node's built-in test runner) |
| `npx prisma migrate dev` | Create/apply a migration after editing `src/prisma/schema.prisma` |
| `npx prisma migrate deploy` | Apply migrations in production |
| `npx prisma db seed` | Seed categories and the optional admin |
| `npx prisma studio` | Browse the data in the browser |

## Roles

One role per account, set at registration. `ADMIN` can never be self-assigned through the API.

| Role | How you get it | Can do |
|---|---|---|
| `CUSTOMER` | default at register | browse products, keep a cart and addresses, place and cancel own orders |
| `MERCHANT_OWNER` | `role` at register | apply as a merchant, add branches and products, work their branches' orders |
| `MERCHANT_STAFF` | reserved (no invite endpoint yet) | same as the owner for a merchant they belong to |
| `RIDER` | `role` at register (a rider profile is created) | reserved for dispatch (next phase) |
| `ADMIN` | `npx prisma db seed` with `SEED_ADMIN_*` | approve merchants, create categories, see every order and move or cancel any of them |

## Endpoints (all under `/api`; everything except `/health` and `/auth/*` needs `Authorization: Bearer <token>`)

| Method | Path | Who | Purpose |
|---|---|---|---|
| GET | `/health` | public | Liveness + DB check |
| POST | `/auth/register` `/auth/login` | public | Returns `user`, `accessToken` (15 min), `refreshToken`, `expiresIn` |
| POST | `/auth/refresh` `/auth/logout` | public | Rotating refresh tokens (body: `{ refreshToken }`) |
| GET/PUT | `/profile` | any | Own name and phone |
| GET | `/categories` | any | List product categories |
| POST | `/categories` | ADMIN | Create a category |
| POST | `/merchants` | MERCHANT_OWNER | Apply as a merchant (starts as `PENDING_APPROVAL`) |
| GET | `/merchants?status=&page=&pageSize=` | ADMIN | Paginated list |
| PATCH | `/merchants/:id/approve` | ADMIN | Approve a merchant and its pending branches |
| POST | `/merchants/:id/branches` | MERCHANT_* | Add a branch (must belong to that merchant) |
| GET | `/branches?search=&page=&pageSize=` | any | The customer directory: branches that can take orders, by business name |
| GET | `/branches/:id` | any | One directory entry (404 if it isn't listed) |
| GET | `/products?branchId=&page=&pageSize=` | any | Active products of an approved branch |
| POST | `/products` | MERCHANT_* | Add a product |
| PUT | `/products/:id` | MERCHANT_* | Update name, price, category, status |
| GET/POST | `/addresses` | CUSTOMER | Saved delivery addresses (max 10) |
| DELETE | `/addresses/:id` | CUSTOMER | Remove a saved address (204) |
| GET | `/cart` | CUSTOMER | The cart: lines with live prices, branch, `itemCount`, `subtotal` |
| PUT | `/cart/items` | CUSTOMER | Set a product's quantity (1-20): `{ productId, quantity, replaceCart? }` |
| DELETE | `/cart/items/:productId` | CUSTOMER | Remove one product |
| DELETE | `/cart` | CUSTOMER | Empty the cart |
| POST | `/orders/quote` | CUSTOMER | Price the cart for an address without ordering: `{ addressId }` |
| POST | `/orders` | CUSTOMER | Place the order: `{ addressId, paymentMethod: "COD", notes? }` |
| GET | `/orders?status=&page=&pageSize=` | CUSTOMER, MERCHANT_*, ADMIN | Orders you're allowed to see, newest first |
| GET | `/orders/:id` | CUSTOMER, MERCHANT_*, ADMIN | One order with items, totals, payment and status history |
| PATCH | `/orders/:id/status` | CUSTOMER, MERCHANT_*, ADMIN | Move an order forward or cancel it: `{ status }` |

**Conventions the frontends rely on**

- Lists return `{ items, page, pageSize, total }` (`pageSize` max 100, default 20).
- Money is a 2-decimal **string** (`"150.00"`). Requests accept `150` or `"150.5"`.
- Errors are `{ message, statusCode }`. Validation errors (400) add `issues: [{ path, message }]`.
- A merchant, order or address that isn't yours returns **404**, not 403, so other people's IDs can't be probed.
- Conflicts (409) carry a machine-readable `code` where the UI needs to react: `CART_BRANCH_CONFLICT`,
  `CART_ITEMS_UNAVAILABLE` (plus `unavailable: [names]`), and `allowedNextStatuses` on a bad status change.
- Orders and lists include `allowedNextStatuses`: what **you** may do next. UIs show buttons from it
  and never copy the rules.

## Orders

**Cart.** One cart per customer, holding **one branch at a time** (one merchant per order keeps checkout,
dispatch and payouts simple). Adding from another branch returns `409 CART_BRANCH_CONFLICT`; resend with
`replaceCart: true` to swap. `PUT /cart/items` *sets* the quantity, so repeating a request is harmless.
Prices in the cart are always the product's current price.

**Checkout** (`POST /orders`) runs in one database transaction: re-checks every item is still available,
prices the order, copies product names and prices into the order, copies the delivery address into the
order, creates the payment record and empties the cart. If the same request is sent twice at once, one
order is created and the other gets a 409.

**Pricing.** `delivery fee = DELIVERY_BASE_FEE + DELIVERY_FEE_PER_KM x km`, where km is the straight-line
distance from branch to address rounded up (minimum 1). `total = subtotal + delivery fee + SERVICE_FEE`.
Addresses beyond `MAX_DELIVERY_KM` are refused with `400 OUT_OF_RANGE`. Use `POST /orders/quote` to show the
same numbers before the customer commits.

**Status lifecycle** (rules live in `src/shared/orderStatus.js`):

| From | Customer | Merchant | Admin |
|---|---|---|---|
| `PENDING` | cancel | accept, reject | accept, reject, cancel |
| `ACCEPTED` | cancel | start preparing, cancel | start preparing, cancel |
| `PREPARING` | - | mark ready for pickup, cancel | mark ready for pickup, cancel |
| `READY_FOR_PICKUP` | - | - | cancel |
| `PICKED_UP`, `DELIVERED`, `CANCELLED`, `REJECTED` | - | - | - |

`PICKED_UP` and `DELIVERED` are reserved for riders (next phase). Every change is saved in the order's
status history and in the audit log.

**Directory.** `GET /branches` lists a branch only when it and its merchant are approved and it has at least one
active product, so customers never see a place they can't order from. `productCount` is the number of active products.

**Who sees which orders.** Customers their own; merchants the orders of branches of merchants they belong
to; admins all. Anything else is a 404.

## Adding a feature (example: `riders`)

1. Add or adjust the model in `src/prisma/schema.prisma`, then `npx prisma migrate dev --name add_riders`.
2. `src/models/rider.model.js` (Zod schema) -> `src/services/rider.service.js` ->
   `src/controllers/rider.controller.js` -> `src/routes/rider.routes.js`.
3. Mount it in `src/routes/index.js`. Put it below `router.use(authenticate)` to require login, and use
   `requireRole('MERCHANT_OWNER')` for role-restricted routes. Relative imports need the `.js` extension.

## Design decisions

- **Money is never a JS number.** Amounts are `Decimal(14,2)` in Postgres, 2-dp strings in the JSON
  (services convert Prisma's `Decimal` with `money()`), and `decimal.js` for any arithmetic.
- **Secure by default:** everything under `/api` is behind `authenticate` except health and auth;
  rate limiting (10/min on auth, 120/min overall), helmet, argon2id password hashing, hashed refresh
  tokens with rotation and reuse detection.
- **Every route validates input** with Zod via the `validate` middleware (parsed data is in `req.valid`).
- **Errors:** throw `HttpError` helpers from `src/shared/errors.js`; `errorHandler` formats them as JSON.
  Express 5 forwards errors from `async` handlers automatically, so controllers need no try/catch.
- **Audit log** records auth events and merchant/product changes.
- **Rust-free Prisma client** (`engineType = "client"` + `@prisma/adapter-pg`), generated into
  `src/generated/prisma` and loaded with `import { PrismaClient } from '../generated/prisma/index.js'`.
- **Order snapshots:** `order_items` stores the product name and unit price at checkout so history
  doesn't change when a merchant edits a product.

## Assumptions and known gaps

- Payment, delivery, ledger and settlement **tables exist but have no endpoints yet** (next phases: rider
  dispatch, settlements). Orders are cash on delivery only, and the payment stays `PENDING` (even on a
  cancelled order) until the dispatch phase records the cash collection.
- Stock levels and branch opening hours are **not enforced** at checkout yet.
- There is no merchant web portal yet, so merchants move orders through the API (Postman); admins can do it
  from admin-web.
- No staff-invite endpoint, so `MERCHANT_STAFF` accounts can't be attached to a merchant yet.
- The directory has no distance sorting, categories or ratings yet: it lists by business name with a text search.
- Not yet implemented: email verification and password reset, 2FA, image upload, payments, background jobs.
- Prisma settings live in `package.json` (`"prisma": { "schema", "seed" }`), which Prisma 6 flags as
  deprecated; move them to `prisma.config` when you upgrade to Prisma 7.
- Behind a reverse proxy, call `app.set('trust proxy', 1)` in `src/app.js` so rate limiting sees real client IPs.
- Placing an order may print a `pg` DeprecationWarning about concurrent queries. It comes from Prisma's `pg`
  adapter, not from this code, and is harmless today.
- Access tokens stay valid until expiry (15 min) even if a user's role changes or the account is suspended.
