# University Database — CS3100 Project 3

A Redis in-memory extension of the University Database built in Projects 1 & 2. This project adds a Node + Express + Redis layer for three high-frequency features: a GPA leaderboard, live enrollment counters, and active session tracking.

---

## Project Structure

```
uni_redis/
├── README.md
├── app.js                        # Node + Express + Redis API
├── package.json
└── docs/
    ├── requirements_p3.pdf       # Requirements document with Redis extension
    └── redis_design.md           # Redis data structures and CRUD commands
```

---

## Prerequisites

- [Redis](https://redis.io/download/) running locally on port `6379`
- [Node.js](https://nodejs.org/) v18+

---

## Running the App

```bash
# 1. Install dependencies
npm install

# 2. Make sure Redis is running
redis-server

# 3. Start the Express server
node app.js
# → Server running on http://localhost:3000
# → Connected to Redis
# → Seed data loaded
```

---

## API Endpoints

### GPA Leaderboard (Sorted Set)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/leaderboard` | Full leaderboard, highest GPA first |
| GET | `/leaderboard/top/:n` | Top N students |
| GET | `/leaderboard/:studentId` | Rank + GPA of one student |
| POST | `/leaderboard` | Add a student's GPA |
| PUT | `/leaderboard/:studentId` | Update a student's GPA |
| DELETE | `/leaderboard/:studentId` | Remove student from leaderboard |

### Enrollment Counters (Hash)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/enrollments` | List all section enrollment records |
| GET | `/enrollments/:code/:sectionId` | Details + seats available |
| POST | `/enrollments` | Create a new section record |
| PUT | `/enrollments/:code/:sectionId/register` | Student registers (count +1) |
| PUT | `/enrollments/:code/:sectionId/drop` | Student drops (count -1) |
| DELETE | `/enrollments/:code/:sectionId` | Delete a section record |

### Active Sessions (Set)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sessions` | All logged-in students |
| GET | `/sessions/count` | Number of students online |
| GET | `/sessions/:studentId` | Check if student is online |
| POST | `/sessions/:studentId` | Log student in |
| DELETE | `/sessions/:studentId` | Log student out |
| DELETE | `/sessions` | Clear all sessions |

---

## Video

https://youtu.be/rrpI5sDgaFc

---

## AI Disclosure

This project was developed with assistance from Claude (Anthropic) for generating the Redis design documentation, command examples, and Express API scaffold. All code was reviewed and is explained in the project video.

---

## About

**Course:** CS3100 — Database Management
**Project:** 3 — Key-Value In-Memory Database (Redis)
**Stack:** Node.js · Express · Redis
