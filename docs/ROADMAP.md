# Project Implementation Roadmap & Milestones

## Phase 0: Architecture & Foundation (Current Phase)
- [x] Comprehensive requirements & repository analysis.
- [x] Technology stack & zero-cost infrastructure validation.
- [x] System architecture, ER schema, state machines, and threat model documentation.
- [x] Project memory initialization (`.agent/memory/` and `docs/`).
- [ ] Next.js + TypeScript + Tailwind CSS project scaffolding.
- [ ] Supabase client, SSR helpers, and database migrations setup.

---

## Phase 1: Core Database & Authentication
- [ ] Supabase SQL migration execution (tables, RLS policies, triggers, atomic RPC functions).
- [ ] Auth flows: Login, Signup, Domain-based (`@klu.ac.in`) participant classification.
- [ ] Mandatory Profile Completion interface (Internal vs External schema validation).
- [ ] Global Navigation Layout & Theme system.

---

## Phase 2: Public Event Discovery & Catalog
- [ ] Public Landing page with hero banner, live countdown, and highlights.
- [ ] Event catalog with category filter, search, fee badges, and capacity indicators.
- [ ] Dynamic Event Detail page (`/events/[slug]`) with rules, schedule, and registration actions.
- [ ] Multi-day schedule visual timeline.

---

## Phase 3: Registration & Modular Payment Engine
- [ ] Concurrency-safe atomic registration Server Action (`fn_register_event_atomic`).
- [ ] Free event instant confirmation flow.
- [ ] Modular Payment Provider driver architecture (`IPaymentProvider`).
- [ ] Mock Payment Provider (zero-cost sandbox) + checkout integration.
- [ ] Server-side signature verification & webhook handlers.
- [ ] Participant Dashboard (`/dashboard`) with registered events list.

---

## Phase 4: Cryptographic QR Passes & Event-Day Attendance
- [ ] HMAC-SHA256 QR Token Generator.
- [ ] Participant Digital Pass view with high-res QR code (`/dashboard/passes/[regCode]`).
- [ ] Student Coordinator Mobile Scanner (`/coordinator/[eventId]/scan`) with camera viewfinder & audio feedback.
- [ ] Concurrency-safe attendance check-in RPC (`fn_record_attendance_atomic`).
- [ ] Fallback participant search & manual check-in roster.

---

## Phase 5: Coordinator & Admin Management Portals
- [ ] Staff Coordinator Dashboard (`/staff/[eventId]`): student coordinator assignment, live attendance metrics.
- [ ] Super Admin Dashboard (`/admin`): Event CRUD, category manager, global registrations table.
- [ ] User role assignment management console.
- [ ] Financial audit & payment reconciliation table.
- [ ] In-App Announcements system (Global & Event-specific).
- [ ] CSV/Excel roster and attendance export routes.

---

## Phase 6: Polish, Performance & Production Readiness
- [ ] Edge caching and ISR optimization for public pages.
- [ ] Mobile UX stress testing & offline camera scanner resilience.
- [ ] End-to-end user journey validation (Signup -> Register -> Pay -> Pass -> Scan -> Attend -> Admin).
