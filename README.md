# 🎓 CampusCore — AI-ERP Integrated Student Management System

A full-stack **Next.js 16** application with role-based access control for **Admin**, **Student**, **Teacher**, and **Warden** roles, backed by **MySQL** via **Prisma ORM 7** and secured with **NextAuth.js v4**.

---

## ✨ Features

- **Universal Login** with role selector (Admin / Student / Teacher / Warden)
- **Role-based middleware** — each role is locked to its own dashboard
- **Admin Dashboard** — create users, manage subjects & hostels, view fee status
- **Student Dashboard** — 3-step wizard: course registration → tuition → hostel fee
- **Teacher Dashboard** — view assigned subject and enrolled students
- **Warden Dashboard** — view assigned hostel and resident students
- **Dark glassmorphism UI** built with Tailwind CSS

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router + Server Actions) |
| Auth | NextAuth.js v4 (CredentialsProvider + JWT) |
| Database | MySQL via Prisma ORM 7 |
| DB Adapter | `@prisma/adapter-mariadb` |
| Styling | Tailwind CSS v4 |
| Language | TypeScript |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MySQL 8+ running locally (or remote)

### 1. Clone the repository

```bash
git clone https://github.com/namita3599/CampusCore.git
cd CampusCore/erp-student-management
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your MySQL credentials:

```env
DATABASE_URL="mysql://root:yourpassword@localhost:3306/erp_db"
NEXTAUTH_SECRET="your-secret-here"   # openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
```

> **Create the database first:**
> ```sql
> CREATE DATABASE erp_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
> ```

### 4. Push schema to database

```bash
npx prisma db push
```

### 5. Seed demo data

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

### 6. Start the development server

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
├── lib/prisma.ts                         # Prisma singleton (MariaDB adapter)
├── middleware.ts                         # Role-based route protection
├── prisma/
│   ├── schema.prisma                     # Database schema
│   └── seed.ts                           # Demo data seeder
├── prisma.config.ts                      # Prisma 7 datasource config
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
npm run db:push      # Push Prisma schema to database
npm run db:seed      # Seed demo data
npm run db:studio    # Open Prisma Studio (database GUI)
```

---

## 🏗 Database Schema

```
User ──┬── StudentProfile ──┬── StudentSubject ── Subject ── TeacherProfile ── User
       ├── TeacherProfile   └── StudentHostel  ── Hostel  ── WardenProfile  ── User
       └── WardenProfile
```
