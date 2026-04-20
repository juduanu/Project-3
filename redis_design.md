# Redis Design — University Database (Project 3)

This document describes the Redis data structures and all CRUD commands used to implement the three in-memory features added to the University Database system.

---

## Feature 1: Student GPA Leaderboard (Sorted Set)

### Description
A Redis **Sorted Set** maintains all students ranked by their GPA. Members are `student_id` strings; scores are floating-point GPA values (0.0–4.0). This allows instant top-N leaderboard queries without expensive MongoDB aggregation pipelines on every page load.

**Key:** `leaderboard:gpa`  
**Members:** student IDs (e.g., `"501"`, `"502"`)  
**Scores:** GPA float (e.g., `3.92`)

### Redis Commands

```bash
FLUSHALL

ZADD leaderboard:gpa 3.90 "501"
ZADD leaderboard:gpa 3.43 "502"
ZADD leaderboard:gpa 4.00 "503"
ZADD leaderboard:gpa 3.10 "504"
ZADD leaderboard:gpa 3.00 "505"
ZADD leaderboard:gpa 3.77 "506"

ZREVRANGE leaderboard:gpa 0 -1 WITHSCORES

ZREVRANGE leaderboard:gpa 0 2 WITHSCORES

ZREVRANK leaderboard:gpa "503"

ZSCORE leaderboard:gpa "501"

ZCARD leaderboard:gpa

ZRANGEBYSCORE leaderboard:gpa 3.5 4.0 WITHSCORES

ZADD leaderboard:gpa 4.00 "501"

ZINCRBY leaderboard:gpa 0.05 "502"

ZREM leaderboard:gpa "505"

ZREMRANGEBYSCORE leaderboard:gpa 0 1.99

DEL leaderboard:gpa
```

---

## Feature 2: Active Course Enrollment Counters (Hash)

### Description
A Redis **Hash** per course section stores enrollment metadata and the current live count of enrolled students. This allows the registration page to instantly check seat availability without querying MongoDB's `students` collection.

**Key pattern:** `enrollments:<course_code>:<section_id>`  
**Fields:** `count` (current enrolled), `capacity` (max seats), `course_title`, `semester`

### Redis Commands

```bash
HSET enrollments:CS101:1001 count 3 capacity 40 course_title "Introduction to Programming" semester "Fall 2025"
HSET enrollments:CS201:1003 count 2 capacity 25 course_title "Data Structures" semester "Fall 2025"
HSET enrollments:CS301:1005 count 2 capacity 50 course_title "Algorithms" semester "Fall 2025"
HSET enrollments:MA101:2001 count 4 capacity 30 course_title "Calculus I" semester "Fall 2025"
HSET enrollments:EN101:4001 count 2 capacity 40 course_title "English Composition" semester "Fall 2025"

HGETALL enrollments:CS101:1001

HGET enrollments:CS101:1001 count

HMGET enrollments:CS101:1001 count capacity

EXISTS enrollments:CS101:1001

KEYS enrollments:*

HINCRBY enrollments:CS101:1001 count 1

HINCRBY enrollments:CS101:1001 count -1

HSET enrollments:CS101:1001 capacity 35

HSET enrollments:CS101:1001 semester "Spring 2026"

HDEL enrollments:CS101:1001 semester

DEL enrollments:CS101:1001

```

---

## Feature 3: Currently Logged-In Students (Set)

### Description
A Redis **Set** tracks which student IDs are currently active in the university portal. Sets guarantee uniqueness (no duplicate sessions) and offer O(1) add/remove/lookup.

**Key:** `active_sessions`  
**Members:** student IDs of currently logged-in students (e.g., `"501"`)

### Redis Commands

```bash
SADD active_sessions "501"
SADD active_sessions "502"
SADD active_sessions "503"

SADD active_sessions "504" "505" "506"

SMEMBERS active_sessions

SISMEMBER active_sessions "501"

SCARD active_sessions

SRANDMEMBER active_sessions 3

SMOVE active_sessions inactive_sessions "505"

SREM active_sessions "501"

SREM active_sessions "502" "503"

DEL active_sessions
```

---

## Key Naming Convention

| Key | Type | Example |
|---|---|---|
| `leaderboard:gpa` | Sorted Set | All students ranked by GPA |
| `enrollments:<code>:<id>` | Hash | `enrollments:CS101:1001` |
| `active_sessions` | Set | IDs of logged-in students |

---

## Summary of Data Structures Used

| Feature | Redis Type | Why |
|---|---|---|
| GPA Leaderboard | Sorted Set (ZSET) | Auto-sorted by score; O(log N) insert, O(log N + K) range query |
| Enrollment Counters | Hash | Groups related fields (count, capacity, title) under one key; atomic HINCRBY for concurrency |
| Active Sessions | Set | Guarantees uniqueness; O(1) add/remove/lookup; no duplicates |
