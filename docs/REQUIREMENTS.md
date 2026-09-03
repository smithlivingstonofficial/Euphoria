# Functional & Non-Functional Requirements Specification

## 1. Functional Requirements

### 1.1 Authentication & Profile Management
- **FR-AUTH-01**: User sign up and sign in using Supabase Auth (Email + Password or Magic Link).
- **FR-AUTH-02**: Automatic detection of participant type based on email domain:
  - If domain equals `@klu.ac.in`, classify as `internal`.
  - All other email domains classify as `external`.
- **FR-AUTH-03**: Mandatory profile completion step prior to event registration:
  - *Internal Students*: Full Name, University Email (`@klu.ac.in`), Register/Student Number, School, Department, Year of Study (1/2/3/4/PG), Mobile Number.
  - *External Students*: Full Name, Email, Mobile Number, College / University Name, Degree/Course, Department, Year of Study.
- **FR-AUTH-04**: Role resolution: Every user is assigned the default `participant` role. Specific users can be granted `student_coordinator`, `staff_coordinator`, or `admin` roles in `user_role_assignments`.

### 1.2 Public Event Discovery & Catalog
- **FR-EVT-01**: Public landing page displaying event banners, date highlights, schedule timeline, and event categories.
- **FR-EVT-02**: Search, filter (by category, department, eligibility, fee type), and sort events dynamically.
- **FR-EVT-03**: Rich event detail page displaying:
  - Title, slug, description, category, department/school.
  - Venue, date, start time, end time.
  - Registration start & end window.
  - Pricing (Free or INR amount), participant capacity, current availability status.
  - Rules, judging criteria, coordinator contact details.
  - Live status indicator (`draft`, `published`, `registration_open`, `registration_closed`, `ongoing`, `completed`).

### 1.3 Event Registration Workflow
- **FR-REG-01**: Individual-only registration for Phase 1 (no team registrations).
- **FR-REG-02**: Capacity validation: System must check maximum participant limits and reject registrations once the ceiling is reached using atomic database transactions (`SELECT ... FOR UPDATE` or transactional RPC functions).
- **FR-REG-03**: Eligibility validation: Prevent internal students from registering for external-only events and vice versa if restricted.
- **FR-REG-04**: Duplicate prevention: Unique database constraint on `(event_id, user_id)` ensures a user cannot register more than once for the same event.
- **FR-REG-05**: Free Events: Instant transition from `pending` to `confirmed` status with immediate pass generation.
- **FR-REG-06**: Paid Events: Creates a registration record with `payment_status = 'pending'`, creates a payment order, redirects user to gateway / mock checkout, and confirms registration upon verified server webhook or signed callback.

### 1.4 Payment Gateway Abstraction & Verification
- **FR-PAY-01**: Official Easebuzz payment gateway integration with EaseCheckout iFrame and hosted fallback supporting UPI, Cards, and NetBanking, with SHA-512 cryptographic verification.
- **FR-PAY-02**: Zero trust on frontend callbacks: Registration confirmation must only occur when a cryptographically signed signature / webhook payload is validated server-side.
- **FR-PAY-03**: Support payment lifecycles: `not_required`, `pending`, `paid`, `failed`, `refunded`.

### 1.5 Participant Pass & Cryptographic QR Engine
- **FR-PASS-01**: Auto-generate unique alphanumeric registration code (e.g., `EUPH-2026-X8K9M2`) and an HMAC-SHA256 signed QR token for each confirmed registration.
- **FR-PASS-02**: QR token payload must contain non-guessable, tamper-evident data (Registration ID, Event ID, Nonce, Expiry, Signature) without exposing PII.
- **FR-PASS-03**: In-app pass view with high-contrast QR display, event schedule, venue details, and live status badge.

### 1.6 Attendance & Coordinator Scanning System
- **FR-ATT-01**: Student Coordinator scan interface: Fast camera-based QR scanner using HTML5 camera stream / BarcodeDetector API with sound/haptic feedback.
- **FR-ATT-02**: Instant verification RPC:
  - Validates coordinator's active role & event assignment.
  - Verifies QR token cryptographic signature and expiry.
  - Confirms participant's registration state is `confirmed`.
  - Checks if attendance was already recorded (prevents duplicate scans).
  - Atomically writes to `attendance` table with timestamp and scanning coordinator's ID.
- **FR-ATT-03**: Manual participant search by student register number / email / registration code as a fallback when camera scanning fails.

### 1.7 Staff Coordinator & Admin Portals
- **FR-STF-01**: Staff dashboard scoped strictly to assigned events (view registered roster, filter check-ins, view stats).
- **FR-STF-02**: Staff assignment tool: Staff coordinators can assign and revoke student coordinators for their assigned events.
- **FR-ADM-01**: Global admin dashboard with CRUD operations for categories, events, users, role assignments, financial summary, and system audit logs.
- **FR-ADM-02**: CSV/Excel export for registration lists, attendance logs, and financial reconciliation.

### 1.8 In-App Announcements & Notifications
- **FR-NOTIF-01**: Global announcement board on participant dashboard and public feed.
- **FR-NOTIF-02**: Event-specific announcements (e.g., venue change, timing update) shown to registered participants of that event.
- **FR-NOTIF-03**: Zero SMS/WhatsApp cost: strictly in-app notification indicators.

---

## 2. Non-Functional Requirements

### 2.1 Performance & Latency
- **NFR-PERF-01**: TTFB (Time to First Byte) under 200ms on Vercel Edge for public landing and event catalog pages.
- **NFR-PERF-02**: Coordinator QR scan-to-verification response time under 300ms on 4G mobile connections.
- **NFR-PERF-03**: Lighthouse Performance Score >= 90 on mobile devices.

### 2.2 Security & Compliance
- **NFR-SEC-01**: 100% PostgreSQL Row Level Security (RLS) coverage on all public-schema tables.
- **NFR-SEC-02**: Zero API secrets or Supabase `service_role` keys leaked to the client bundle.
- **NFR-SEC-03**: Input validation and sanitization using Zod on all Server Actions and Route Handlers.
- **NFR-SEC-04**: Strict rate-limiting on sensitive routes (auth attempts, payment initialization, QR verification) using in-memory / database bucket limits.

### 2.3 Reliability & Concurrency
- **NFR-REL-01**: Atomic registration booking avoiding overselling seats during registration spikes.
- **NFR-REL-02**: Graceful offline handling: If coordinator loses connection temporarily, clear UI warnings are shown without corrupting scan queues.

### 2.4 Usability & Accessibility
- **NFR-UX-01**: Responsive layout (Mobile 360px up to Desktop 4K).
- **NFR-UX-02**: Dark/Light mode support with high-contrast accessibility (WCAG AA compliant).
- **NFR-UX-03**: High-density coordinator mode optimized for bright sunlight / outdoor scanning.
