const express = require('express');
const path = require('path');
const { data, persist, genId, now } = require('./db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const VISIT_STATUSES = ['requested', 'scheduled', 'completed', 'cancelled'];
const VISIT_TYPES = ['scheduled', 'on_demand'];

app.get('/api/debug', (req, res) => {
  res.json({ nodeVersion: process.version, storage: 'json-file', dbFile: path.join(__dirname, 'pashu-vikas.json') });
});

// --- Farmers ---
app.get('/api/farmers', (req, res) => {
  res.json([...data.farmers].sort((a, b) => b.created_at.localeCompare(a.created_at)));
});

app.post('/api/farmers', (req, res) => {
  const { name, mobile, village, district, state } = req.body;
  if (!name || !mobile) return res.status(400).json({ error: 'name and mobile are required' });
  const farmer = { id: genId(), name, mobile, village: village || null, district: district || null, state: state || null, created_at: now() };
  data.farmers.push(farmer);
  persist();
  res.status(201).json({ id: farmer.id });
});

app.get('/api/farmers/:id', (req, res) => {
  const f = data.farmers.find(x => x.id === req.params.id);
  if (!f) return res.status(404).json({ error: 'not found' });
  res.json(f);
});

// --- Doctors ---
app.get('/api/doctors', (req, res) => {
  res.json([...data.doctors].sort((a, b) => b.created_at.localeCompare(a.created_at)));
});

app.post('/api/doctors', (req, res) => {
  const { name, mobile, specialization, district } = req.body;
  if (!name || !mobile) return res.status(400).json({ error: 'name and mobile are required' });
  const doctor = { id: genId(), name, mobile, specialization: specialization || null, district: district || null, created_at: now() };
  data.doctors.push(doctor);
  persist();
  res.status(201).json({ id: doctor.id });
});

app.get('/api/doctors/:id', (req, res) => {
  const d = data.doctors.find(x => x.id === req.params.id);
  if (!d) return res.status(404).json({ error: 'not found' });
  res.json(d);
});

// --- Buffaloes ---
function withFarmer(b) {
  const f = data.farmers.find(x => x.id === b.farmer_id);
  return { ...b, farmer_name: f ? f.name : null, farmer_mobile: f ? f.mobile : null };
}

app.get('/api/buffaloes', (req, res) => {
  const { farmer_id } = req.query;
  let rows = data.buffaloes;
  if (farmer_id) rows = rows.filter(b => b.farmer_id === farmer_id);
  res.json(rows.map(withFarmer).sort((a, b) => b.created_at.localeCompare(a.created_at)));
});

app.post('/api/buffaloes', (req, res) => {
  const { farmer_id, tag_id, breed, dob, color, notes } = req.body;
  if (!farmer_id || !breed) return res.status(400).json({ error: 'farmer_id and breed are required' });
  const farmer = data.farmers.find(x => x.id === farmer_id);
  if (!farmer) return res.status(400).json({ error: 'unknown farmer_id — select a farmer first' });
  const buffalo = { id: genId(), farmer_id, tag_id: tag_id || null, breed, dob: dob || null, color: color || null, notes: notes || null, created_at: now() };
  data.buffaloes.push(buffalo);
  persist();
  res.status(201).json({ id: buffalo.id });
});

app.get('/api/buffaloes/:id', (req, res) => {
  const b = data.buffaloes.find(x => x.id === req.params.id);
  if (!b) return res.status(404).json({ error: 'not found' });
  res.json(withFarmer(b));
});

// --- Visits ---
function withVisitJoins(v) {
  const f = data.farmers.find(x => x.id === v.farmer_id);
  const b = data.buffaloes.find(x => x.id === v.buffalo_id);
  const d = v.doctor_id ? data.doctors.find(x => x.id === v.doctor_id) : null;
  return { ...v, farmer_name: f ? f.name : null, tag_id: b ? b.tag_id : null, breed: b ? b.breed : null, doctor_name: d ? d.name : null };
}

app.get('/api/visits', (req, res) => {
  const { farmer_id, buffalo_id, doctor_id, status } = req.query;
  let rows = data.visits;
  if (farmer_id) rows = rows.filter(v => v.farmer_id === farmer_id);
  if (buffalo_id) rows = rows.filter(v => v.buffalo_id === buffalo_id);
  if (doctor_id) rows = rows.filter(v => v.doctor_id === doctor_id);
  if (status) rows = rows.filter(v => v.status === status);
  res.json(rows.map(withVisitJoins).sort((a, b) => b.created_at.localeCompare(a.created_at)));
});

app.post('/api/visits', (req, res) => {
  const { farmer_id, buffalo_id, doctor_id, visit_type, scheduled_date, reason } = req.body;
  if (!farmer_id || !buffalo_id) return res.status(400).json({ error: 'farmer_id and buffalo_id are required' });
  const buffalo = data.buffaloes.find(x => x.id === buffalo_id);
  if (!buffalo) return res.status(400).json({ error: 'unknown buffalo_id' });
  if (buffalo.farmer_id !== farmer_id) return res.status(400).json({ error: 'this buffalo does not belong to the selected farmer' });
  if (doctor_id && !data.doctors.find(x => x.id === doctor_id)) return res.status(400).json({ error: 'unknown doctor_id' });
  const type = VISIT_TYPES.includes(visit_type) ? visit_type : 'scheduled';
  const visit = {
    id: genId(), farmer_id, buffalo_id, doctor_id: doctor_id || null, visit_type: type,
    status: doctor_id ? 'scheduled' : 'requested', scheduled_date: scheduled_date || null, reason: reason || null, created_at: now()
  };
  data.visits.push(visit);
  persist();
  res.status(201).json({ id: visit.id });
});

app.get('/api/visits/:id', (req, res) => {
  const v = data.visits.find(x => x.id === req.params.id);
  if (!v) return res.status(404).json({ error: 'not found' });
  res.json(withVisitJoins(v));
});

app.patch('/api/visits/:id', (req, res) => {
  const visit = data.visits.find(x => x.id === req.params.id);
  if (!visit) return res.status(404).json({ error: 'not found' });
  const { doctor_id, status, scheduled_date } = req.body;
  if (status && !VISIT_STATUSES.includes(status)) return res.status(400).json({ error: 'invalid status' });
  if (doctor_id && !data.doctors.find(x => x.id === doctor_id)) return res.status(400).json({ error: 'unknown doctor_id' });
  if (doctor_id !== undefined) visit.doctor_id = doctor_id || null;
  if (status) visit.status = status;
  else if (doctor_id && visit.status === 'requested') visit.status = 'scheduled';
  if (scheduled_date !== undefined) visit.scheduled_date = scheduled_date || null;
  persist();
  res.json({ id: visit.id, status: visit.status, doctor_id: visit.doctor_id });
});

// --- Health assessments ---
app.get('/api/assessments', (req, res) => {
  const { buffalo_id, doctor_id } = req.query;
  let rows = data.health_assessments;
  if (buffalo_id) rows = rows.filter(a => a.buffalo_id === buffalo_id);
  if (doctor_id) rows = rows.filter(a => a.doctor_id === doctor_id);
  const joined = rows.map(a => {
    const b = data.buffaloes.find(x => x.id === a.buffalo_id);
    const f = b ? data.farmers.find(x => x.id === b.farmer_id) : null;
    return { ...a, tag_id: b ? b.tag_id : null, breed: b ? b.breed : null, farmer_name: f ? f.name : null };
  });
  res.json(joined.sort((a, b) => b.created_at.localeCompare(a.created_at)));
});

app.post('/api/assessments', (req, res) => {
  const { buffalo_id, doctor_id, visit_id, weight_kg, temperature_c, notes, follow_up_date } = req.body;
  if (!buffalo_id || !doctor_id) return res.status(400).json({ error: 'buffalo_id and doctor_id are required' });
  const buffalo = data.buffaloes.find(x => x.id === buffalo_id);
  if (!buffalo) return res.status(400).json({ error: 'unknown buffalo_id' });
  const doctor = data.doctors.find(x => x.id === doctor_id);
  if (!doctor) return res.status(400).json({ error: 'unknown doctor_id — register the doctor first' });
  if (visit_id) {
    const visit = data.visits.find(x => x.id === visit_id);
    if (!visit) return res.status(400).json({ error: 'unknown visit_id' });
    if (visit.buffalo_id !== buffalo_id) return res.status(400).json({ error: 'visit does not match the selected buffalo' });
  }
  const assessment = {
    id: genId(), buffalo_id, assessed_by: doctor.name, doctor_id, visit_id: visit_id || null,
    weight_kg: weight_kg || null, temperature_c: temperature_c || null, notes: notes || null,
    follow_up_date: follow_up_date || null, created_at: now()
  };
  data.health_assessments.push(assessment);
  if (visit_id) {
    const visit = data.visits.find(x => x.id === visit_id);
    if (visit) visit.status = 'completed';
  }
  persist();
  res.status(201).json({ id: assessment.id });
});

// --- Dashboard stats ---
app.get('/api/stats', (req, res) => {
  res.json({
    farmers: data.farmers.length,
    doctors: data.doctors.length,
    buffaloes: data.buffaloes.length,
    visits: data.visits.length,
    assessments: data.health_assessments.length
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Pashu Vikas POC running at http://localhost:${PORT}`));
