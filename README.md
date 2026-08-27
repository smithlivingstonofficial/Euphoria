# 🌟 Euphoria - College Cultural & Technical Fest Management Platform

Euphoria is a modern, high-performance web platform built for managing national-level college cultural and technical festivals. Built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

---

## ✨ Features

- 🎟️ **Cryptographic QR Ticketing & Check-in**: Secure HMAC-SHA256 signed dynamic/static QR passes for entry & event verification.
- 👥 **Role-Based Access Control (RBAC)**: Fine-grained permissions for Admins, Faculty, Student Coordinators, and Participants.
- 💳 **Flexible Payment Integration**: Modular payment architecture supporting sandbox/mock payments and payment gateways like Razorpay.
- 🏆 **Event Management & Team Registrations**: Support for solo and team registrations with dynamic team sizes and captain controls.
- 📊 **Real-time Analytics & Attendance**: Live check-in dashboards, capacity monitoring, and participant verification.
- 📱 **Responsive & Accessible UI**: Modern, sleek mobile-first design with smooth interactions.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL with RLS policies)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Validation**: [Zod](https://zod.dev/)

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/smithlivingstonofficial/Euphoria.git
cd Euphoria
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example `.env` file and fill in your Supabase and app credentials:

```bash
cp .env.example .env.local
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

---

## 📁 Project Structure

```text
├── docs/           # Architecture, Database, RBAC & API specifications
├── src/
│   ├── app/        # Next.js App Router routes & API endpoints
│   ├── components/ # Reusable UI & layout components
│   └── lib/        # Supabase client, auth helpers, QR utilities
├── supabase/       # Database migrations & SQL schema definitions
└── public/         # Static assets and media
```

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
