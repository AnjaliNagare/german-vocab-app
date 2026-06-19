# Wortify - German Vocabulary App

A full-stack German vocabulary learning app using the **SM-2 spaced repetition algorithm** and **AI-generated example sentences** to help users retain words in long-term memory.

[![CI](https://github.com/AnjaliNagare/german-vocab-app/actions/workflows/ci.yml/badge.svg)](https://github.com/AnjaliNagare/german-vocab-app/actions/workflows/ci.yml)

🔗 **Live app:** https://german-vocab-app-frontend.onrender.com

---

## Features

- **Spaced repetition (SM-2)** — words are scheduled for review at optimal intervals based on recall performance
- **AI example sentences** — when a word is forgotten (rating 1), Groq LLM generates a natural German sentence using that word in context
- **CEFR levels** — words tagged A1 / A2 / B1 / B2
- **Progress dashboard** — total words, reviews done, words due today, day streak
- **JWT authentication** — secure register / login with bcrypt password hashing
- **Full CRUD** — add, edit, delete words with inline editing

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, React Router, Recharts |
| Backend | Node.js, Express.js, REST API |
| Database | PostgreSQL (Render managed) |
| Auth | JWT + bcrypt |
| AI | Groq API (Llama 3) / Ollama (local) |
| Testing | Jest, Supertest |
| DevOps | Docker, docker-compose, GitHub Actions CI |
| Deployment | Render (backend + frontend + DB) |

---

## Architecture
┌─────────────────┐       ┌──────────────────┐       ┌─────────────┐
│  React Frontend │──────▶│  Express Backend  │──────▶│  PostgreSQL │
│  (Vite + Router)│       │  REST API + JWT   │       │  (4 tables) │
└─────────────────┘       └──────────────────┘       └─────────────┘
│
▼
┌──────────────────┐
│   Groq / Ollama  │
│   LLM API        │
└──────────────────┘
---

## Run locally

**Prerequisites:** Node.js 20+, PostgreSQL, Git

```bash
# Clone
git clone https://github.com/AnjaliNagare/german-vocab-app.git
cd german-vocab-app

# Backend setup
cd backend
cp .env.example .env      # fill in your values
psql -U postgres -c "CREATE DATABASE german_vocab"
psql -U postgres -d german_vocab -f src/db/schema.sql
npm install
npm run dev

# Frontend setup (new terminal)
cd frontend
cp .env.example .env      # set VITE_API_URL=http://localhost:5000
npm install
npm run dev
```

Open http://localhost:5173

---

## Run with Docker

```bash
cp .env.example .env   # fill in JWT_SECRET and GROQ_API_KEY
docker-compose up --build
```

Open http://localhost:3000

---

## Run tests

```bash
cd backend
npm test
```

---

## SM-2 Algorithm

The app implements the classic SM-2 spaced repetition algorithm. After each review, the user rates recall from 1–4:

| Rating | Meaning | Next review |
|---|---|---|
| 1 | Forgot | Tomorrow + AI sentence |
| 2 | Hard | Slight increase |
| 3 | Good | Standard interval |
| 4 | Easy | Longer interval |

The ease factor adjusts over time — words you find easy are shown less frequently, words you struggle with appear more often.

---

## Project structure
german-vocab-app/
├── frontend/              # React + Vite
│   ├── src/
│   │   ├── api/           # Axios instance
│   │   ├── components/    # Navbar, ProtectedRoute
│   │   ├── context/       # AuthContext
│   │   └── pages/         # Dashboard, Review, Words, AddWord
│   └── Dockerfile
├── backend/               # Node.js + Express
│   ├── src/
│   │   ├── db/            # Pool + schema.sql
│   │   ├── middleware/    # JWT auth
│   │   ├── routes/        # auth, words, review
│   │   └── services/      # srsAlgorithm, aiService
│   ├── tests/             # Jest + Supertest
│   └── Dockerfile
├── docker-compose.yml
└── .github/workflows/     # GitHub Actions CI

---

## Author

**Anjali Nagare** — Full-Stack Developer, Hamburg
[GitHub](https://github.com/AnjaliNagare) · [Portfolio](https://anjalinagare-portfolio.vercel.app/)

