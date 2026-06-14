# NexusEdge AI

The Ultimate AI-Powered Career, Learning & Placement Ecosystem.

A premium enterprise-grade platform combining LeetCode-style coding practice, LMS, AI career coaching, ATS resume analysis, mock interviews, placement management, and recruiter hiring — all in one seamless experience.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion, ShadCN UI, Recharts |
| Backend | Node.js, NestJS, PostgreSQL, Redis, JWT, OAuth |
| AI | OpenAI, Gemini, Anthropic (integration-ready) |
| Storage | AWS S3 (integration-ready) |
| Deployment | Docker, Kubernetes, AWS |

## Features

- **7 Role-Based Dashboards** — Super Admin, College Admin, Placement Officer, Training Coordinator, Faculty, Recruiter, Student
- **Learning Management** — Courses, learning paths, skill trees, AI tutor
- **Coding Ecosystem** — Online compiler, DSA practice, 8 languages
- **Assessments** — MCQ, aptitude, technical, coding, proctoring
- **AI Resume Builder & ATS Analyzer**
- **Mock Interview System** — HR, technical, coding with AI evaluation
- **Portfolio & Project Showcase**
- **Placement Management & Recruiter Portal**
- **Gamification** — XP, badges, streaks, leaderboards
- **Analytics** — Learning, coding, placement, institutional insights

## Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- Docker (optional, for full stack)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Backend

```bash
cd backend
npm install
npm run start:dev
```

API: [http://localhost:4000/api/v1](http://localhost:4000/api/v1)  
Swagger: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)

### Docker (Full Stack)

```bash
docker-compose up -d
```

## Demo Login

Visit `/login` and choose any role to explore role-specific dashboards:

| Role | Dashboard Path |
|------|---------------|
| Student | `/dashboard/student` |
| Faculty | `/dashboard/faculty` |
| College Admin | `/dashboard/college-admin` |
| Placement Officer | `/dashboard/placement-officer` |
| Training Coordinator | `/dashboard/training-coordinator` |
| Recruiter | `/dashboard/recruiter` |
| Super Admin | `/dashboard/super-admin` |

## Project Structure

```
Just_Code/
├── frontend/          # Next.js application
│   ├── src/
│   │   ├── app/       # Pages & routes
│   │   ├── components/# UI components
│   │   └── lib/       # Utils, types, mock data
│   └── package.json
├── backend/           # NestJS API
│   ├── src/
│   │   └── modules/   # Auth, Users, Health
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Design System

- Glassmorphism cards with soft shadows
- Gradient accents (violet → indigo → cyan)
- Dark & light mode support
- Framer Motion micro-animations
- Inspired by Apple, Stripe, Linear, Vercel, Notion

## Environment Variables

### Frontend (`frontend/.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

### Backend (`backend/.env`)

```
PORT=4000
DATABASE_URL=postgresql://nexusedge:nexusedge_secret@localhost:5432/nexusedge
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000
OPENAI_API_KEY=
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
AWS_S3_BUCKET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

## License

Proprietary — NexusEdge AI © 2026
