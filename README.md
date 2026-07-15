# 🎓 CampusCore — Multi-Tenant AI-ERP Integrated Student Management System

CampusCore is a modern, enterprise-ready **Multi-Tenant SaaS** ERP platform designed for schools, colleges, and universities. Built with **Next.js 16 (App Router + Server Actions)**, **Supabase PostgreSQL (Prisma ORM 7)**, and **FastAPI**, it provides seamless row-level tenant isolation, automated fee administration, and AI-powered facial recognition.

---

## 🏛️ Multi-Tenant SaaS Architecture

CampusCore utilizes a **Shared Database (Row-Level Isolation)** architecture:
- **Tenant Isolation**: Model entities (Users, StudentProfiles, Hostels, Subjects, Complaints, etc.) carry an `institutionId` reference.
- **Request Scoping**: Database queries are automatically filtered using a request-based Prisma client extension (`lib/prisma.ts`) triggered by a Next.js proxy header (`x-tenant-id`) or session token, preventing cross-tenant data leaks.
- **Unified Login**: A 4-field centralized login (Institution Code + Role + Username + Password) dynamically resolves the user's institution context and redirects them to their role's isolated dashboard.
- **Institution Registration**: Public endpoint at `/register-institution` allows new colleges to register, setting up their tenant record and primary admin account atomically.

---

## ✨ Features

- **Institution Setup**: Genesis flow creates the Tenant (`Institution`) and primary `ADMIN` atomically.
- **4-Field Authentication**: Login requires choosing a portal role (Student, Teacher, Warden, Admin) matching the database record.
- **Admin Dashboard**: Bulk upload students/teachers via Excel, create courses, assign warden-to-hostels and teacher-to-subjects.
- **Student Dashboard**: 3-step enrollment wizard (Course registration → Tuition payment → Hostel room selection).
- **Teacher Dashboard**: Scoped student rosters, course grades, and real-time daily attendance grids.
- **Warden Dashboard**: Hostel room allocation, resident occupancy charts, and complaint tracking.
- **AI Facial Recognition**: Local Python FastAPI service storing facial embeddings via `pgvector` for attendance tracking.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend / Server | Next.js 16 (React 19, Server Actions, App Router) |
| AI Microservice | FastAPI (Python, Uvicorn, pgvector) |
| Database | Supabase (PostgreSQL) |
| ORM | Prisma ORM 7 (`@prisma/adapter-pg`) |
| Auth | NextAuth.js v4 (Credentials Provider + JWT) |
| Cache & Limits | Upstash Redis |
| Styling | Tailwind CSS v4 |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- A Supabase PostgreSQL database with the `vector` extension enabled

### 1. Clone & Install

```bash
git clone https://github.com/namita3599/CampusCore.git
cd CampusCore
npm install
```

### 2. Configure Environment

Create `.env` based on the example:

```bash
cp .env.example .env
```

Ensure all connection strings, NextAuth secrets, SMTP mail credentials, and Upstash keys are filled in.

---

## 🗄️ Database Setup & Migrations (Supabase Safe)

Because Supabase blocks the creation of temporary database instances, standard `prisma migrate dev` (which requires a shadow database) is disabled. Use the following workflow to apply schema changes safely:

### 1. Re-generate Client Types
```bash
npx prisma generate
```

### 2. Setup Baseline Migration (If setting up for the first time)
```bash
# Capture current database state
npx prisma migrate diff --from-empty --to-config-datasource --script > prisma/migrations/0_init_baseline/migration.sql

# Mark the baseline as already applied
npx prisma migrate resolve --applied "0_init_baseline"
```

### 3. Generate & Apply Schema Updates
```bash
# 1. Generate the diff SQL script
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script > prisma/migrations/[migration_name]/migration.sql

# 2. Execute the script directly on your database
npx prisma db execute --file prisma/migrations/[migration_name]/migration.sql

# 3. Mark the migration as resolved in history
npx prisma migrate resolve --applied "[migration_name]"
```

### 4. Seed Seed Data
```bash
npx prisma db seed
```

---

## 💻 Running the Application

To run both Next.js and the AI Facial Recognition microservice concurrently:

```bash
npm run dev
```

- **Next.js Web Client**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🔐 Role-Based Access Controls

Access is matched to specific route groups inside `proxy.ts`:

| Route Prefix | Role Access |
|---|---|
| `/dashboard/admin/*` | ADMIN |
| `/dashboard/student/*` | STUDENT |
| `/dashboard/teacher/*` | TEACHER |
| `/dashboard/warden/*` | WARDEN |

---

## 📝 Seeding Multi-Tenant Demo Data

The database seeder setup creates a tenant college:
- **Institution Code**: `demo2024`
- **Admin**: `admin` / `adminPassword123`
- **Student**: `co_cse-2026-001` / `student123`
- **Teacher**: `teacher_john` / `teacher123`
- **Warden**: `warden_mary` / `warden123`
