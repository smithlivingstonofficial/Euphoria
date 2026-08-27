# Application Route & Navigation Architecture

## 1. Next.js App Router Structure

The platform uses Next.js Route Groups `(group)` to cleanly separate layouts, authorization middleware, and UI contexts.

```
src/app/
├── (public)/                        # Public Landing & Discovery Area
│   ├── layout.tsx                   # Public Header + Footer
│   ├── page.tsx                     # Landing Page (Hero, Timeline, Highlights)
│   ├── events/
│   │   ├── page.tsx                 # Event Catalog (Search, Filter, Categories)
│   │   └── [slug]/
│   │       └── page.tsx             # Event Details & Registration Trigger
│   ├── schedule/
│   │   └── page.tsx                 # Multi-day Event Schedule
│   └── announcements/
│       └── page.tsx                 # Public Festival Announcements
│
├── (auth)/                          # Authentication Flows
│   ├── layout.tsx                   # Minimal Centered Card Layout
│   ├── login/
│   │   └── page.tsx                 # Login Form (Password / Magic link)
│   ├── register/
│   │   └── page.tsx                 # Signup Form (Domain classification hint)
│   ├── complete-profile/
│   │   └── page.tsx                 # Mandatory Profile Completion Form
│   ├── forgot-password/
│   │   └── page.tsx                 # Password Recovery
│   └── callback/
│       └── route.ts                 # Supabase Auth Cookie Exchange Route
│
├── (participant)/                   # Participant Portal
│   ├── layout.tsx                   # Participant Sidebar + Topbar Layout
│   └── dashboard/
│       ├── page.tsx                 # Overview (Registered Events, Quick Pass)
│       ├── my-events/
│       │   └── page.tsx             # My Registered Events List
│       ├── passes/
│       │   ├── page.tsx             # All Event Passes
│       │   └── [regCode]/
│       │       └── page.tsx         # Fullscreen Digital Pass + High-Res QR
│       ├── profile/
│       │   └── page.tsx             # Edit Profile Details
│       └── announcements/
│           └── page.tsx             # Personalized Announcements Feed
│
├── (coordinator)/                   # Student Coordinator Portal (Mobile First)
│   ├── layout.tsx                   # Mobile App-Style Bottom Nav / App Bar
│   └── coordinator/
│       ├── page.tsx                 # Assigned Events Selector
│       └── [eventId]/
│           ├── scan/
│           │   └── page.tsx         # Camera QR Scanner Terminal
│           ├── roster/
│           │   └── page.tsx         # Participant Search & Manual Check-in
│           └── stats/
│               └── page.tsx         # Real-time Check-in Counter & Stats
│
├── (staff)/                         # Staff Coordinator Portal
│   ├── layout.tsx                   # Staff Dashboard Layout
│   └── staff/
│       ├── page.tsx                 # Assigned Department Events Overview
│       └── [eventId]/
│           ├── page.tsx             # Event Operations & Live Analytics
│           ├── coordinators/
│           │   └── page.tsx         # Manage Student Coordinator Assignments
│           └── export/
│               └── route.ts         # Attendance / Roster CSV Export
│
├── (admin)/                         # Super Admin Console
│   ├── layout.tsx                   # Comprehensive Admin Sidebar Layout
│   └── admin/
│       ├── page.tsx                 # Global Platform Dashboard & Key Metrics
│       ├── events/
│       │   ├── page.tsx             # Events Management Table
│       │   ├── new/
│       │   │   └── page.tsx         # Create Event Form
│       │   └── [id]/edit/
│       │       └── page.tsx         # Edit Event Form
│       ├── categories/
│       │   └── page.tsx             # Event Categories CRUD
│       ├── registrations/
│       │   └── page.tsx             # Global Registrations Table & Filters
│       ├── payments/
│       │   └── page.tsx             # Financial Reconciliation & Gateway Logs
│       ├── users/
│       │   └── page.tsx             # User & Role Assignment Management
│       ├── staff-assignments/
│       │   └── page.tsx             # Staff-to-Event Delegation
│       ├── announcements/
│       │   └── page.tsx             # Broadcast Announcements Publisher
│       └── reports/
│           └── page.tsx             # Executive Summary & Consolidated Exports
│
└── api/                             # API Endpoints & Webhooks
    ├── attendance/
    │   └── verify/
    │       └── route.ts             # QR Verification Endpoint (for scanner)
    ├── payment/
    │   ├── create-order/
    │   │   └── route.ts             # Initialize payment order
    │   ├── verify/
    │   │   └── route.ts             # Server-side verification
    │   └── webhook/
    │       └── route.ts             # Gateway Webhook Listener
    └── export/
        └── [type]/
            └── route.ts             # Secure CSV Data Exporters
```
