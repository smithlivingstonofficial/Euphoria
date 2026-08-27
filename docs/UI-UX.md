## 1. Visual Design Language & Aesthetics

- **Theme Palette**: Crisp, compact professional Light Theme with clean slate backgrounds (`#F8FAFC`, `#FFFFFF`), subtle borders (`#E2E8F0`, `#CBD5E1`), and deep slate typography (`#0F172A`, `#334155`, `#64748B`).
- **Brand Accents**: Primary Indigo (`#4F46E5`), Sky Blue (`#0284C7`), Emerald Green (`#059669`), and Rose (`#E11D48`).
- **Compact Information Density**: Clean tabular layouts, condensed cards, high-contrast badges, crisp typography, and optimized data density for fast event-day operations.
- **Typography**: Clean system sans-serif hierarchy (Inter / System Sans) paired with monospaced accents (`JetBrains Mono`, `font-mono`) for registration codes, dates, fees, and pass nonces.

---

## 2. Key Screen Breakdown

### 2.1 Public Landing Page
- **Hero Section**: High-impact festival branding, animated countdown timer, quick "Explore Events" CTA.
- **Category Filter Tabs**: Quick pills (Technical, Coding, Robotics, AI, Paper Presentation).
- **Featured Events Grid**: Dynamic cards showing fee badges (`FREE` or `₹XXX`), capacity meters, registration countdowns.
- **Live Schedule & Venue Map**: Visual timeline of event slots across campus auditoriums.

### 2.2 Participant Digital Pass Screen
- **Format**: High-contrast, mobile wallet card aesthetic.
- **QR Code Card**: Crisp black/white high-error-correction QR code with instant brightness boost toggle.
- **Metadata**: Event Name, Venue, Time Slot, Participant Name, Register Number / College, Status Badge (`CONFIRMED`).

### 2.3 Coordinator Mobile Scanner Terminal
- **Viewport**: 100% full-screen camera viewfinder with a glowing target scanning box.
- **Instant Feedback Overlay**:
  - **Success (Green)**: Large checkmark, audio chime, participant name and department in bold.
  - **Warning (Amber)**: "Already Checked-In at 10:42 AM".
  - **Error (Red)**: "Invalid Pass / Wrong Event".
- **Bottom Drawer**: Quick counter (`Checked In: 48 / 120`), quick switch between Camera Scan and Manual Roster Lookup.

### 2.4 Staff & Admin Dashboards
- **High-Density Data Tables**: Instant client-side search, column filtering, multi-select batch exports.
- **Live Metric Cards**: Total Revenue, Confirmed Participants, Check-in Percentage, Department Breakdown.
