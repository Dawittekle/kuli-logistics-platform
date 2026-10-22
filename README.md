# Kulli Logistics Platform

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Render-brightgreen?style=for-the-badge&logo=render)](https://kuli-logistics-landing.onrender.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0+-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)

> **Live Deployment:** 🌐 [https://kuli-logistics-landing.onrender.com/](https://kuli-logistics-landing.onrender.com/)

**Kulli** is an on-demand freight and moving logistics platform engineered for urban transport corridors in Addis Ababa (Bole, Merkato, Kality, etc.). It connects shippers and commercial businesses with verified truck owners through upfront transparent pricing, automated vehicle payload matching, and real-time corridor dispatch tracking.

---

## 🚀 Key Highlights & Capabilities

- **Interactive 5-Step Booking Engine:** Streamlined workflow covering pickup/drop-off routing, real-time Google Maps preview, searchable cargo inventory with live weight/volume calculation, vehicle recommendation (Pickups, Isuzu NPR, FSR, Heavy Trucks), and access requirements.
- **Dynamic Live Route Preview:** Embedded Google Maps displaying authentic corridor endpoints, distance, transit duration, and price breakdown in Ethiopian Birr (ETB).
- **Real-Time Dispatch & Tracking Simulator:** Live transit simulator with milestone progression (Order Placed &rarr; Driver Assigned &rarr; Loading &rarr; In Transit &rarr; Delivered) and in-app driver messaging.
- **Role-Based Authentication Gate:** Split-screen customer/driver onboarding with mobile OTP verification, session storage, and draft restoration upon sign-in.
- **Production Monorepo Architecture:** Clean separation of concerns across web, API, admin, and mobile services with shared domain contracts.

---

## 🏗️ Repository Architecture

```text
kuli-logistics-platform/
├── apps/
│   ├── landing/    # Marketing portal & booking flow (Vite + TypeScript + Modern CSS)
│   ├── api/        # REST API services, MongoDB persistence, Supabase Auth JWKS
│   ├── mobile/     # Cross-platform Expo React Native app for clients & drivers
│   └── admin/      # Dispatch & operations dashboard (Vite + React)
├── packages/
│   └── shared/     # Shared type contracts, schemas, and API client helpers
├── docs/           # Architecture diagrams, brand tokens, and developer guidelines
└── tools/          # Linting, typechecking, and startup verification scripts
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend & Web** | TypeScript, Vite, Semantic HTML5, Vanilla CSS3 (Custom Design Tokens, Flexbox/Grid) |
| **Backend API** | Node.js, Express, Modular Domain Services, Supabase Auth (JWKS token verification) |
| **Data & Storage** | MongoDB, Redis |
| **Mobile & Admin** | React Native (Expo), React, Vite |
| **Testing & CI** | Node.js Native Test Runner (`node:test`), AST static linting, strict TypeScript |
| **Deployment** | Render ([Live App](https://kuli-logistics-landing.onrender.com/)) |

---

## 💻 Getting Started Locally

### Prerequisites

- **Node.js:** `v20+`
- **npm:** `v10+` (npm workspaces enabled)
- **Docker & Docker Compose** (for MongoDB and Redis)

### Quick Start

```bash
# 1. Clone repository & install dependencies
git clone https://github.com/your-username/kuli-logistics-platform.git
cd kuli-logistics-platform
npm install

# 2. Start local databases (MongoDB on 27018, Redis on 6380)
docker compose up -d

# 3. Launch application services
npm run dev:landing   # Marketing & Booking: http://localhost:5175
npm run dev:api       # REST API:            http://127.0.0.1:4000/api/v1
npm run dev:admin     # Admin Dashboard:     http://localhost:5174
npm run dev:mobile    # Mobile Client:       Expo Dev Tools
```

### Production Build & Preview

```bash
# Compile landing and booking application
npm run build:landing

# Preview compiled build locally (http://localhost:4175)
npm run preview --workspace @kuli/landing
```

---

## 🧪 Verification & Quality Checks

Run the verification pipeline to ensure code standards and test compliance:

```bash
npm run lint          # Validates project structure and code standards
npm run typecheck     # Validates TypeScript contracts across workspaces
npm test              # Executes the full node:test suite
```

---

## 📄 License

This project is licensed under the MIT License.
