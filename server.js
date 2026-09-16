const express = require('express');
const path = require('path');
const { db, genId } = require('./db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const VISIT_STATUSES = ['requested', 'scheduled', 'completed', 'cancelled'];
const VISIT_TYPES = ['scheduled', 'on_demand'];

// --- Farmers ---
app.get('/api/farmers', (req, res) => {
  res.json(db.prepare('SELECT * FROM farmers ORDER BY created_at DESC').all());
});

app.post('/api/farmers', (req, res) => {
  const { name, mobile, village, district, state } = req.body;
  if (!name || !mobile) return res.status(400).json({ error: 'name and mobile are required' });
  const id = genId();
  db.prepare(
    `INSERT INTO farmers (id, name, mobile, village, district, state, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
  ).run(id, name, mobile, village || null, district || null, state || null);
  res.status(201).json({ id });
});

app.get('/api/farmers/:id', (req, res) => {
  const f = db.prepare('SELECT * FROM farmers WHERE id = ?').get(req.params.id);
  if (!f) return res.status(404).json({ error: 'not found' });
  res.json(f);
});

// --- Doctors ---
app.get('/api/doctors', (req, res) => {
  res.json(db.prepare('SELECT * FROM doctors ORDER BY created_at DESC').all());
});

app.post('/api/doctors', (req, res) => {
  const { name, mobile, specialization, district } = req.body;
  if (!name || !mobile) return res.status(400).json({ error: 'name and mobile are required' });
  const id = genId();
  db.prepare(
    `INSERT INTO doctors (id, name, mobile, specialization, district, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`
  ).run(id, name, mobile, specialization || null, district || null);
  res.status(201).json({ id });
});

app.get('/api/doctors/:id', (req, res) => {
  const d = db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.params.id);
  if (!d) return res.status(404).json({ error: 'not found' });
  res.json(d);
});

// --- Buffaloes ---
app.get('/api/buffaloes', (req, res) => {
  const { farmer_id } = req.query;
  const rows = farmer_id
    ? db.prepare(
        `SELECT b.*, f.name AS farmer_name, f.mobile AS farmer_mobile
         FROM buffaloes b JOIN farmers f ON f.id = b.farmer_id
         WHERE b.farmer_id = ? ORDER BY b.created_at DESC`
      ).all(farmer_id)
    : db.prepare(
        `SELECT b.*, f.name AS farmer_name, f.mobile AS farmer_mobile
         FROM buffaloes b JOIN farmers f ON f.id = b.farmer_id
         ORDER BY b.created_at DESC`
      ).all();
  res.json(rows);
});

app.post('/api/buffaloes', (req, res) => {
  const { farmer_id, tag_id, breed, dob, color, notes } = req.body;
  if (!farmer_id || !breed) return res.status(400).json({ error: 'farmer_id and breed are required' });
  const farmer = db.prepare('SELECT id FROM farmers WHERE id = ?').get(farmer_id);
  if (!farmer) return res.status(400).json({ error: 'unknown farmer_id — select a farmer first' });
  const id = genId();
  db.prepare(
    `INSERT INTO buffaloes (id, farmer_id, tag_id, breed, dob, color, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).run(id, farmer_id, tag_id || null, breed, dob || null, color || null, notes || null);
  res.status(201).json({ id });
});

app.get('/api/buffaloes/:id', (req, res) => {
  const row = db.prepare(
    `SELECT b.*, f.name AS farmer_name, f.mobile AS farmer_mobile
     FROM buffaloes b JOIN farmers f ON f.id = b.farmer_id WHERE b.id = ?`
  ).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

// --- Visits (scheduling / assignment) ---
app.get('/api/visits', (req, res) => {
  const { farmer_id, buffalo_id, doctor_id, status } = req.query;
  const clauses = [];
  const params = [];
  if (farmer_id) { clauses.push('v.farmer_id = ?'); params.push(farmer_id); }
  if (buffalo_id) { clauses.push('v.buffalo_id = ?'); params.push(buffalo_id); }
  if (doctor_id) { clauses.push('v.doctor_id = ?'); params.push(doctor_id); }
  if (status) { clauses.push('v.status = ?'); params.push(status); }
  const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
  const rows = db.prepare(
    `SELECT v.*, f.name AS farmer_name, b.tag_id, b.breed, d.name AS doctor_name
     FROM visits v
     JOIN farmers f ON f.id = v.farmer_id
     JOIN buffaloes b ON b.id = v.buffalo_id
     LEFT JOIN doctors d ON d.id = v.doctor_id
     ${where} ORDER BY v.created_at DESC`
  ).all(...params);
  res.json(rows);
});

app.post('/api/visits', (req, res) => {
  const { farmer_id, buffalo_id, doctor_id, visit_type, scheduled_date, reason } = req.body;
  if (!farmer_id || !buffalo_id) return res.status(400).json({ error: 'farmer_id and buffalo_id are required' });
  const buffalo = db.prepare('SELECT id, farmer_id FROM buffaloes WHERE id = ?').get(buffalo_id);
  if (!buffalo) return res.status(400).json({ error: 'unknown buffalo_id' });
  if (buffalo.farmer_id !== farmer_id) return res.status(400).json({ error: 'this buffalo does not belong to the selected farmer' });
  if (doctor_id) {
    const doctor = db.prepare('SELECT id FROM doctors WHERE id = ?').get(doctor_id);
    if (!doctor) return res.status(400).json({ error: 'unknown doctor_id' });
  }
  const type = VISIT_TYPES.includes(visit_type) ? visit_type : 'scheduled';
  const id = genId();
  const status = doctor_id ? 'scheduled' : 'requested';
  db.prepare(
    `INSERT INTO visits (id, farmer_id, buffalo_id, doctor_id, visit_type, status, scheduled_date, reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).run(id, farmer_id, buffalo_id, doctor_id || null, type, status, scheduled_date || null, reason || null);
  res.status(201).json({ id });
});

app.get('/api/visits/:id', (req, res) => {
  const row = db.prepare(
    `SELECT v.*, f.name AS farmer_name, b.tag_id, b.breed, d.name AS doctor_name
     FROM visits v
     JOIN farmers f ON f.id = v.farmer_id
     JOIN buffaloes b ON b.id = v.buffalo_id
     LEFT JOIN doctors d ON d.id = v.doctor_id
     WHERE v.id = ?`
  ).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

app.patch('/api/visits/:id', (req, res) => {
  const visit = db.prepare('SELECT * FROM visits WHERE id = ?').get(req.params.id);
  if (!visit) return res.status(404).json({ error: 'not found' });
  const { doctor_id, status, scheduled_date } = req.body;
  if (status && !VISIT_STATUSES.includes(status)) return res.status(400).json({ error: 'invalid status' });
  if (doctor_id) {
    const doctor = db.prepare('SELECT id FROM doctors WHERE id = ?').get(doctor_id);
    if (!doctor) return res.status(400).json({ error: 'unknown doctor_id' });
  }
  const nextDoctor = doctor_id !== undefined ? doctor_id : visit.doctor_id;
  const nextStatus = status || (doctor_id && visit.status === 'requested' ? 'scheduled' : visit.status);
  const nextDate = scheduled_date !== undefined ? scheduled_date : visit.scheduled_date;
  db.prepare('UPDATE visits SET doctor_id = ?, status = ?, scheduled_date = ? WHERE id = ?')
    .run(nextDoctor || null, nextStatus, nextDate || null, req.params.id);
  res.json({ id: req.params.id, status: nextStatus, doctor_id: nextDoctor });
});

// --- Health assessments ---
app.get('/api/assessments', (req, res) => {
  const { buffalo_id, doctor_id } = req.query;
  const clauses = [];
  const params = [];
  if (buffalo_id) { clauses.push('a.buffalo_id = ?'); params.push(buffalo_id); }
  if (doctor_id) { clauses.push('a.doctor_id = ?'); params.push(doctor_id); }
  const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
  const rows = db.prepare(
    `SELECT a.*, b.tag_id, b.breed, f.name AS farmer_name
     FROM health_assessments a
     JOIN buffaloes b ON b.id = a.buffalo_id
     JOIN farmers f ON f.id = b.farmer_id
     ${where} ORDER BY a.created_at DESC`
  ).all(...params);
  res.json(rows);
});

app.post('/api/assessments', (req, res) => {
  const { buffalo_id, doctor_id, visit_id, weight_kg, temperature_c, notes, follow_up_date } = req.body;
  if (!buffalo_id || !doctor_id) return res.status(400).json({ error: 'buffalo_id and doctor_id are required' });
  const buffalo = db.prepare('SELECT id FROM buffaloes WHERE id = ?').get(buffalo_id);
  if (!buffalo) return res.status(400).json({ error: 'unknown buffalo_id' });
  const doctor = db.prepare('SELECT id, name FROM doctors WHERE id = ?').get(doctor_id);
  if (!doctor) return res.status(400).json({ error: 'unknown doctor_id — register the doctor first' });
  if (visit_id) {
    const visit = db.prepare('SELECT id, buffalo_id FROM visits WHERE id = ?').get(visit_id);
    if (!visit) return res.status(400).json({ error: 'unknown visit_id' });
    if (visit.buffalo_id !== buffalo_id) return res.status(400).json({ error: 'visit does not match the selected buffalo' });
  }
  const id = genId();
  db.prepare(
    `INSERT INTO health_assessments (id, buffalo_id, assessed_by, doctor_id, visit_id, weight_kg, temperature_c, notes, follow_up_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).run(id, buffalo_id, doctor.name, doctor_id, visit_id || null, weight_kg || null, temperature_c || null, notes || null, follow_up_date || null);
  if (visit_id) db.prepare('UPDATE visits SET status = ? WHERE id = ?').run('completed', visit_id);
  res.status(201).json({ id });
});

// --- Dashboard stats ---
app.get('/api/stats', (req, res) => {
  res.json({
    farmers: db.prepare('SELECT COUNT(*) c FROM farmers').get().c,
    doctors: db.prepare('SELECT COUNT(*) c FROM doctors').get().c,
    buffaloes: db.prepare('SELECT COUNT(*) c FROM buffaloes').get().c,
    visits: db.prepare('SELECT COUNT(*) c FROM visits').get().c,
    assessments: db.prepare('SELECT COUNT(*) c FROM health_assessments').get().c
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Pashu Vikas POC running at http://localhost:${PORT}`));
