const express = require('express');
const redis = require('redis');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

client.on('error', (err) => console.error('Redis error:', err));

(async () => {
  await client.connect();
  console.log('Connected to Redis');
  await seedData();
})();

async function seedData() {
  await client.zAdd('leaderboard:gpa', [
    { score: 3.90, value: '501' },
    { score: 3.43, value: '502' },
    { score: 4.00, value: '503' },
    { score: 3.10, value: '504' },
    { score: 3.00, value: '505' },
    { score: 3.77, value: '506' },
  ]);

  const sections = [
    { key: 'enrollments:CS101:1001', count: 3, capacity: 40, title: 'Introduction to Programming', semester: 'Fall 2025' },
    { key: 'enrollments:CS201:1003', count: 2, capacity: 25, title: 'Data Structures', semester: 'Fall 2025' },
    { key: 'enrollments:CS301:1005', count: 2, capacity: 50, title: 'Algorithms', semester: 'Fall 2025' },
    { key: 'enrollments:MA101:2001', count: 4, capacity: 30, title: 'Calculus I', semester: 'Fall 2025' },
  ];
  for (const s of sections) {
    await client.hSet(s.key, { count: s.count, capacity: s.capacity, course_title: s.title, semester: s.semester });
  }

  await client.sAdd('active_sessions', ['501', '503', '506']);

  console.log('Seed data loaded.');
}

app.get('/leaderboard', async (req, res) => {
  const entries = await client.zRangeWithScores('leaderboard:gpa', 0, -1, { REV: true });
  const result = entries.map((e, i) => ({ rank: i + 1, studentId: e.value, gpa: e.score }));
  res.json(result);
});

app.get('/leaderboard/top/:n', async (req, res) => {
  const n = parseInt(req.params.n) - 1;
  const entries = await client.zRangeWithScores('leaderboard:gpa', 0, n, { REV: true });
  res.json(entries.map((e, i) => ({ rank: i + 1, studentId: e.value, gpa: e.score })));
});

app.get('/leaderboard/:studentId', async (req, res) => {
  const id = req.params.studentId;
  const [score, rank] = await Promise.all([
    client.zScore('leaderboard:gpa', id),
    client.zRevRank('leaderboard:gpa', id)
  ]);
  if (score === null) return res.status(404).json({ error: 'Student not found in leaderboard' });
  res.json({ studentId: id, gpa: score, rank: rank + 1 });
});

app.post('/leaderboard', async (req, res) => {
  const { studentId, gpa } = req.body;
  if (!studentId || gpa === undefined) return res.status(400).json({ error: 'studentId and gpa required' });
  await client.zAdd('leaderboard:gpa', [{ score: parseFloat(gpa), value: String(studentId) }]);
  res.status(201).json({ message: 'Student added to leaderboard', studentId, gpa: parseFloat(gpa) });
});

app.put('/leaderboard/:studentId', async (req, res) => {
  const id = req.params.studentId;
  const { gpa } = req.body;
  await client.zAdd('leaderboard:gpa', [{ score: parseFloat(gpa), value: id }]);
  res.json({ message: 'GPA updated', studentId: id, gpa: parseFloat(gpa) });
});

app.delete('/leaderboard/:studentId', async (req, res) => {
  const removed = await client.zRem('leaderboard:gpa', req.params.studentId);
  if (!removed) return res.status(404).json({ error: 'Student not found' });
  res.json({ message: 'Student removed from leaderboard', studentId: req.params.studentId });
});


app.get('/enrollments', async (req, res) => {
  const keys = await client.keys('enrollments:*');
  const result = [];
  for (const key of keys) {
    const data = await client.hGetAll(key);
    result.push({ key, ...data });
  }
  res.json(result);
});

app.get('/enrollments/:courseCode/:sectionId', async (req, res) => {
  const key = `enrollments:${req.params.courseCode}:${req.params.sectionId}`;
  const data = await client.hGetAll(key);
  if (!Object.keys(data).length) return res.status(404).json({ error: 'Section not found' });
  const seatsLeft = parseInt(data.capacity) - parseInt(data.count);
  res.json({ key, ...data, seats_available: seatsLeft });
});

app.post('/enrollments', async (req, res) => {
  const { courseCode, sectionId, capacity, courseTitle, semester } = req.body;
  if (!courseCode || !sectionId || !capacity) return res.status(400).json({ error: 'courseCode, sectionId, capacity required' });
  const key = `enrollments:${courseCode}:${sectionId}`;
  await client.hSet(key, { count: 0, capacity: parseInt(capacity), course_title: courseTitle || '', semester: semester || '' });
  res.status(201).json({ message: 'Section created', key });
});

app.put('/enrollments/:courseCode/:sectionId/register', async (req, res) => {
  const key = `enrollments:${req.params.courseCode}:${req.params.sectionId}`;
  const [count, capacity] = await Promise.all([client.hGet(key, 'count'), client.hGet(key, 'capacity')]);
  if (count === null) return res.status(404).json({ error: 'Section not found' });
  if (parseInt(count) >= parseInt(capacity)) return res.status(409).json({ error: 'Section is full' });
  const newCount = await client.hIncrBy(key, 'count', 1);
  res.json({ message: 'Student registered', newCount, capacity: parseInt(capacity) });
});

app.put('/enrollments/:courseCode/:sectionId/drop', async (req, res) => {
  const key = `enrollments:${req.params.courseCode}:${req.params.sectionId}`;
  const count = await client.hGet(key, 'count');
  if (count === null) return res.status(404).json({ error: 'Section not found' });
  if (parseInt(count) <= 0) return res.status(400).json({ error: 'Count already 0' });
  const newCount = await client.hIncrBy(key, 'count', -1);
  res.json({ message: 'Student dropped', newCount });
});

app.delete('/enrollments/:courseCode/:sectionId', async (req, res) => {
  const key = `enrollments:${req.params.courseCode}:${req.params.sectionId}`;
  const deleted = await client.del(key);
  if (!deleted) return res.status(404).json({ error: 'Section not found' });
  res.json({ message: 'Section enrollment record deleted', key });
});


app.get('/sessions', async (req, res) => {
  const members = await client.sMembers('active_sessions');
  res.json({ online: members, count: members.length });
});

app.get('/sessions/count', async (req, res) => {
  const count = await client.sCard('active_sessions');
  res.json({ studentsOnline: count });
});

app.get('/sessions/:studentId', async (req, res) => {
  const online = await client.sIsMember('active_sessions', req.params.studentId);
  res.json({ studentId: req.params.studentId, online });
});

app.post('/sessions/:studentId', async (req, res) => {
  const added = await client.sAdd('active_sessions', req.params.studentId);
  const msg = added ? 'Student logged in' : 'Student was already online';
  res.status(added ? 201 : 200).json({ message: msg, studentId: req.params.studentId });
});

app.delete('/sessions/:studentId', async (req, res) => {
  const removed = await client.sRem('active_sessions', req.params.studentId);
  if (!removed) return res.status(404).json({ error: 'Student was not in active sessions' });
  res.json({ message: 'Student logged out', studentId: req.params.studentId });
});

app.delete('/sessions', async (req, res) => {
  await client.del('active_sessions');
  res.json({ message: 'All sessions cleared' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
