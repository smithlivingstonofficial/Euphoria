# EUPHORIA — Event Management Platform
**Kalasalingam Academy of Research and Education (KARE)**

## 1. Executive Summary
Euphoria is the premier annual technical festival hosted by Kalasalingam Academy of Research and Education (KARE). The platform is a dedicated, production-grade event management web application engineered to handle the complete event lifecycle:
1. Public event discovery & schedule exploration
2. Dual-mode user onboarding & authentication (Internal `@klu.ac.in` vs External)
3. Profile validation & management
4. Event registration with strict concurrency & eligibility validation
5. Modular payment processing (server-verified, mockable/gateway-agnostic)
6. Cryptographically signed, dynamic QR passes
7. Role-scoped, high-throughput offline-resilient event day attendance scanning
8. Multi-tier administrative & coordinator operations (Staff & Student Co-ordinators)
9. Real-time reporting, exportable rosters, and analytics

---

## 2. Core Architectural Principles

- **Zero/Minimal Infrastructure Cost**: Operates cleanly within generous free tiers (Vercel Hobby/Pro + Supabase Free/Pro) without incurring third-party API subscription costs (no paid SMS OTPs, no paid WhatsApp bots, no paid transactional email dependencies).
- **Minimal Dependency Footprint**: Built with Next.js App Router (React Server Components), Supabase (PostgreSQL + Auth + RLS + Storage), and Tailwind CSS + Lucide Icons + standard UI primitives. No auxiliary microservices, Express/Nest servers, or Redis instances.
- **Strict Role-Based Access Control (RBAC)**: Enforced directly at the PostgreSQL layer using Supabase Row Level Security (RLS) policies paired with Server Actions and Middleware guards.
- **Data Integrity & Concurrency Safety**: Relies on PostgreSQL ACID transactions, unique constraints, and atomic database functions (`rpc`) to eliminate race conditions during registration capacity checks and payment confirmations.
- **Mobile-First High-Stress Execution**: Coordinator scanning interfaces and participant passes are engineered for low-latency, mobile touchscreens, and spotty auditorium Wi-Fi conditions.

---

## 3. Stakeholder Ecosystem & Scope

| Stakeholder Role | Access Level | Primary Objectives |
| :--- | :--- | :--- |
| **Participant (Internal)** | User (`@klu.ac.in`) | Fast registration using university credentials, free/discounted event access, dynamic QR pass. |
| **Participant (External)** | User (Other domains) | Self-registration, institutional affiliation capture, fee payment processing, pass retrieval. |
| **Student Coordinator** | Event-Scoped Operations | Fast mobile QR scanning, participant search, check-in validation, attendance record locking. |
| **Staff Coordinator** | Event-Scoped Management | Oversight of assigned department events, student coordinator assignment, live attendance analytics, roster export. |
| **Super Admin / Platform Admin** | Global Operations | Full platform control: event creation, category setup, fee config, role assignments, financial audits, broadcast announcements, platform analytics. |

---

## 4. Technology Baseline

- **Framework**: Next.js 14+ / 15 (App Router, Server Actions, Route Handlers, React Server Components)
- **Language**: TypeScript (Strict Mode)
- **Database & Auth**: Supabase (Managed PostgreSQL 15+, Supabase Auth with JWT claims, Row Level Security)
- **Styling**: Tailwind CSS, PostCSS, Lucide React, Radix UI Primitives (shadcn/ui design patterns)
- **Hosting & Edge**: Vercel (Edge network, Serverless Functions)
- **State & Data Mutations**: React Server Actions, optimistic UI patterns, Supabase Postgres RPC for critical atomicity.
