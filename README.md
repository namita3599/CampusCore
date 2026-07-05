# 🎓 CampusCore — AI-ERP Integrated Student Management System

A full-stack **Next.js 16** application with role-based access control for **Admin**, **Student**, **Teacher**, and **Warden** roles, backed by **Supabase PostgreSQL** via **Prisma ORM 7** and secured with **NextAuth.js v4**.

---

## ✨ Features

- **Universal Login** with role selector (Admin / Student / Teacher / Warden)
- **Role-based proxy** — each role is locked to its own dashboard
- **Admin Dashboard** — create users, manage subjects & hostels, view fee status
- **Student Dashboard** — 3-step wizard: course registration → tuition → hostel fee
- **Teacher Dashboard** — view assigned subject and enrolled students
- **Warden Dashboard** — view assigned hostel and resident students
- **Clean institutional UI** built with Tailwind CSS and shadcn/ui primitives

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router + Server Actions) |
| Auth | NextAuth.js v4 (CredentialsProvider + JWT) |
| Database | Supabase (PostgreSQL) |
| ORM | Prisma ORM 7 |
| DB Adapter | `@prisma/adapter-pg` |
| Styling | Tailwind CSS v4 |
| Language | TypeScript |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account and project (free tier works)

### 1. Clone the repository

```bash
git clone https://github.com/namita3599/CampusCore.git
cd CampusCore
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Navigate to **Project Settings → Database → Connection string**
3. Copy both connection strings as described below

### 4. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials and a real NextAuth secret:

```env
# Transaction pooler (port 6543) — used by the Next.js app at runtime
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Direct connection (port 5432) — used by Prisma CLI for db push / migrations
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

NEXTAUTH_SECRET="your-secret-here"   # openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
```

> **Why two URLs?**
> - `DATABASE_URL` goes through pgBouncer (Supabase's connection pooler) — efficient for serverless/edge runtimes.
> - `DIRECT_URL` is a plain direct connection used by Prisma CLI (`db push` / `migrate`) — pgBouncer doesn't support the DDL statements that schema changes require.

### 5. Sync schema to Supabase

```bash
npx prisma db push
```

This also regenerates the Prisma client in this project.

### 6. Seed demo data

```bash
npm run db:seed
```

This creates the following demo accounts:

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `adminPassword123` |
| Student | `student_alice` | `student123` |
| Teacher | `teacher_john` | `teacher123` |
| Warden | `warden_mary` | `warden123` |

### 7. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
erp-student-management/
├── app/
│   ├── api/auth/[...nextauth]/route.ts   # NextAuth handler + authOptions
│   ├── dashboard/
│   │   ├── layout.tsx                    # Shared dashboard layout (sidebar)
│   │   ├── components/Sidebar.tsx        # Role-aware sidebar navigation
│   │   ├── admin/                        # Admin dashboard + Server Actions
│   │   ├── student/                      # Student 3-step wizard
│   │   ├── teacher/                      # Teacher dashboard
│   │   └── warden/                       # Warden dashboard
│   ├── login/page.tsx                    # Universal login page
│   ├── providers.tsx                     # NextAuth SessionProvider
│   └── globals.css                       # Global styles
├── lib/prisma.ts                         # Prisma singleton (pg adapter)
├── proxy.ts                               # Role-based route protection
├── prisma/
│   ├── schema.prisma                     # Database schema (PostgreSQL)
│   └── seed.ts                           # Demo data seeder
├── prisma.config.ts                      # Prisma 7 datasource config (DIRECT_URL)
├── .env.example                          # Example environment variables
└── types/next-auth.d.ts                  # Session/JWT type augmentation
```

---

## 🔐 Role-Based Access

| Route Prefix | Allowed Role |
|---|---|
| `/dashboard/admin/*` | ADMIN |
| `/dashboard/student/*` | STUDENT |
| `/dashboard/teacher/*` | TEACHER |
| `/dashboard/warden/*` | WARDEN |

Unauthorized access is automatically redirected to the correct dashboard.

---

## 📝 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run db:generate   # Generate Prisma client
npm run db:push      # Sync Prisma schema to Supabase and regenerate client
npm run db:seed      # Seed demo data
npm run db:studio    # Open Prisma Studio (database GUI)
```

---

## 🗄 Database Schema

```
User ──┬── StudentProfile ──┬── StudentSubject ── Subject ── TeacherProfile ── User
       ├── TeacherProfile   └── StudentHostel  ── Hostel  ── WardenProfile  ── User
       └── WardenProfile
```

All tables are hosted on **Supabase PostgreSQL** with row-level security available for future hardening.

---

## ☁️ Deployment

This app is deployment-ready for **Vercel** (recommended with Supabase):

1. Push your code to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Add the environment variables (`DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`)
4. Deploy — Vercel + Supabase work natively together
