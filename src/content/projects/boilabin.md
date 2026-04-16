---
title: Boilabin-Marketplace
slug: boilabin
description: A modern ecommerce marketplace built for Bangladesh with product
  discovery, flash deals, Wishlist, compare, reviews, admin management, seller
  workflows, and mobile friendly shopping.
tools:
  - Next.js
  - React
  - TypeScript
  - Tailwind CSS
  - PostgreSQL
thumbnail: /uploads/screenshot-2026-04-16-165256.jpg
source_code: ""
live_demo: ""
featured: true
---
# Boilabin

<div align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Inter&weight=700&size=24&pause=1100&color=5B2C83&center=true&vCenter=true&width=980&lines=Bangladesh-first+full-stack+ecommerce+marketplace;Premium+storefront%2C+admin+panel%2C+and+seller-ready+architecture;Built+with+Next.js%2C+TypeScript%2C+Prisma%2C+and+PostgreSQL" alt="Boilabin animated intro" />
</div>

<div align="center">
  <strong>Boilabin</strong><br />
  Bangladesh first premium ecommerce platform with storefront, admin, and seller ready architecture.
</div>

<br />

![Next.js](https://img.shields.io/badge/Next.js-15-111111?style=for-the-badge&logo=nextdotjs&logoColor=white) ![React](https://img.shields.io/badge/React-18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=0B1120) ![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white) ![NextAuth](https://img.shields.io/badge/Auth-NextAuth-7C3AED?style=for-the-badge) ![Zustand](https://img.shields.io/badge/State-Zustand-4B2E2E?style=for-the-badge) ![Private Repo](https://img.shields.io/badge/Repo-Private-5B2C83?style=for-the-badge)

![Storefront](https://img.shields.io/badge/Storefront-Customer%20Ready-111827?style=flat-square&logo=vercel&logoColor=white) ![Admin](https://img.shields.io/badge/Admin-Operations%20Panel-2B2D42?style=flat-square&logo=buffer&logoColor=white) ![Compare](https://img.shields.io/badge/Compare-Live-3F3D56?style=flat-square&logo=semanticuireact&logoColor=white) ![Reviews](https://img.shields.io/badge/Reviews-Delivered%20Order%20Flow-4C1D95?style=flat-square&logo=trustpilot&logoColor=white) ![SEO](https://img.shields.io/badge/SEO-Dynamic%20Product%20Meta-1D4ED8?style=flat-square&logo=googlechrome&logoColor=white) ![Flash Deals](https://img.shields.io/badge/Flash%20Deals-Real%20Campaign%20Only-6D28D9?style=flat-square&logo=lightning&logoColor=white) ![Bangladesh First](https://img.shields.io/badge/Market-Bangladesh%20First-0F766E?style=flat-square&logo=shopify&logoColor=white) ![Single Store](https://img.shields.io/badge/Mode-Single%20Store%20Ready-7C2D12?style=flat-square&logo=homeassistant&logoColor=white)

---

## Overview

Boilabin is a premium ecommerce marketplace focused on Bangladesh-first shopping. The project combines a polished storefront, a functional admin panel, and a seller-ready architecture that can scale into a larger marketplace later.

### What it includes

- Customer storefront with category discovery, search, cart, checkout, wishlist, compare, reviews, and account pages
- Admin panel for products, categories, brands, flash sales, banners, content, reports, inventory, reviews, and orders
- Seller foundation with onboarding, dashboard, product management, and order handling structure
- SEO-focused product metadata and Bangladesh-first pricing language
- Local asset organization for branding, payments, categories, and uploaded media

---

## Feature Snapshot

| Area | Highlights |
| --- | --- |
| Storefront | Hero banners, featured collections, flash deals, new arrivals, category browsing, brand pages |
| Shopping | Cart drawer, wishlist, compare, 3-step checkout, guest-friendly flow, order confirmation |
| Product System | Variants, attributes, specs, sale pricing, stock tracking, review summaries |
| Reviews | Delivered-order review flow, moderation, rating sync |
| Admin | Product CRUD, brand/category management, coupons, banners, flash sale campaigns, reports |
| Marketplace Ready | Seller onboarding structure, seller admin review, seller order and product sections |
| SEO | Dynamic metadata, Bangladesh pricing phrases, product-level meta title and description generation |

---

## Tech Stack

### Core Stack

- `Next.js 15` with App Router
- `React 18`
- `TypeScript`
- `Tailwind CSS`
- `Prisma 5`
- `PostgreSQL`
- `NextAuth v5`
- `Zustand`
- `Zod`
- `React Hook Form`
- `Sharp`

### Frontend Tooling

- `Lucide React`
- `Framer Motion`
- `TanStack Query`
- `SWR`
- `Embla Carousel`

---

## Project Structure

```text
boilabin-marketplace/
|-- prisma/
|   |-- schema.prisma
|   `-- seed.ts
|-- public/
|   |-- assets/
|   |   |-- branding/
|   |   |-- categories/
|   |   `-- payments/
|   `-- uploads/
|-- src/
|   |-- app/
|   |   |-- (store)/
|   |   |-- (admin)/
|   |   |-- (seller)/
|   |   `-- api/
|   |-- backend/
|   |-- frontend/
|   |   |-- components/
|   |   |-- stores/
|   |   `-- media/
|   `-- shared/
|-- scripts/
|-- next.config.js
`-- README.md
```

---

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create `.env` and set at least:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/boilabin"
NEXTAUTH_SECRET="generate-a-strong-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Set up database

```bash
npx prisma db push
npm run db:seed
```

### 4. Start development

```bash
npm run dev
```

Open `http://localhost:3000`

---

## Demo Access

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@boilabin.com` | `Admin@123` |
| Customer | `customer@example.com` | `Customer@123` |

### Useful routes

- Storefront: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`
- Seller: `http://localhost:3000/seller`

---

## NPM Scripts

```bash
npm run dev        # Start Next.js in development
npm run build      # Production build
npm run start      # Run production server
npm run lint       # Lint project
npm run db:seed    # Seed demo data
npm run db:studio  # Open Prisma Studio
npm run db:reset   # Reset and reseed database
```

---

## Payments

### Currently working

- `Cash on Delivery`

### Present in UI, but not live until gateway integration is completed

- `bKash`
- `Nagad`
- `Card / Online Banking`
- `Stripe`

This keeps the checkout honest: unsupported gateways should not pretend to complete payment until a real gateway handoff exists.

---

## Admin Coverage

The admin panel is designed to manage the store as a real working operations dashboard.

### Included sections

- Products
- Categories
- Brands
- Orders
- Reviews
- Coupons
- Inventory
- Flash sales
- Banners
- Content blocks
- Reports
- Settings
- Seller review and control flows

---

## Marketplace Direction

Boilabin is built so it can stay first-party now and still grow into a broader marketplace later.

### Current direction

- Single-store friendly storefront
- Seller model and seller dashboard foundation already present
- Admin can review seller-side flows and marketplace-style entities

### Future-ready path

- Enable third-party seller onboarding fully
- Add live seller payouts and payment settlements
- Expand seller compliance and approval workflows

---

## SEO Notes

The project already supports product-focused metadata patterns such as:

- `iPad Pro price in BD`
- `iPad Pro price in Bangladesh`
- Brand-aware meta descriptions with BDT pricing
- Product metadata generation from product fields

This makes product pages more suitable for search-driven ecommerce traffic in Bangladesh.

---

## Asset Organization

All long-term static assets are grouped for easier maintenance.

```text
public/assets/
|-- branding/
|-- categories/
`-- payments/
```

This keeps permanent visuals separate from uploaded runtime media under `public/uploads/`.

---

## Why This Project Stands Out

- Bangladesh-focused ecommerce flow instead of a generic template-only build
- Real admin structure, not just a storefront demo
- Seller-ready architecture without forcing marketplace complexity too early
- Strong asset organization and SEO-aware content direction
- Designed to be polished visually while still practical to extend

---

## Development Notes

### Product comparison

The compare page now supports:

- side-by-side pricing
- stock status
- ratings
- category info
- product description
- direct add-to-cart actions

### Flash deals

Flash deal banners and sections now only appear when there is a real active flash-sale campaign with actual products behind it.

---

## Roadmap

- Live Bangladesh payment gateway integration
- Production-grade caching and rate limiting
- More advanced seller operations
- Better reporting and export flows
- Stronger visual product media and showcase polish

---

## License

This project is currently private and maintained as a custom product build.
