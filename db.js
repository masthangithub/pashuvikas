const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const rawDb = new DatabaseSync(path.join(__dirname, 'pashu-vikas.db'));

// better-sqlite3-compatible thin wrapper so server.js code is unchanged
const db = {
  exec(sql) { rawDb.exec(sql); },
  prepare(sql) {
    const stmt = rawDb.prepare(sql);
    return {
      run: (...params) => stmt.run(...params),
      get: (...params) => stmt.get(...params),
      all: (...params) => stmt.all(...params)
    };
  },
  pragma() {}
};

db.exec(`
CREATE TABLE IF NOT EXISTS farmers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  village TEXT,
  district TEXT,
  state TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS doctors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  specialization TEXT,
  district TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS buffaloes (
  id TEXT PRIMARY KEY,
  farmer_id TEXT NOT NULL REFERENCES farmers(id),
  tag_id TEXT,
  breed TEXT NOT NULL,
  dob TEXT,
  color TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS visits (
  id TEXT PRIMARY KEY,
  farmer_id TEXT NOT NULL REFERENCES farmers(id),
  buffalo_id TEXT NOT NULL REFERENCES buffaloes(id),
  doctor_id TEXT REFERENCES doctors(id),
  visit_type TEXT NOT NULL DEFAULT 'scheduled',
  status TEXT NOT NULL DEFAULT 'requested',
  scheduled_date TEXT,
  reason TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS health_assessments (
  id TEXT PRIMARY KEY,
  buffalo_id TEXT NOT NULL REFERENCES buffaloes(id),
  assessed_by TEXT NOT NULL,
  doctor_id TEXT,
  visit_id TEXT,
  weight_kg REAL,
  temperature_c REAL,
  notes TEXT,
  follow_up_date TEXT,
  created_at TEXT NOT NULL
);
`);

// Safe migration for POC databases created before doctors/visits existed.
function safeAlter(sql) { try { db.exec(sql); } catch (e) { /* column already exists */ } }
safeAlter('ALTER TABLE health_assessments ADD COLUMN doctor_id TEXT');
safeAlter('ALTER TABLE health_assessments ADD COLUMN visit_id TEXT');

let counter = 0;
function genId() {
  counter += 1;
  return Date.now().toString(36) + '-' + counter.toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

module.exports = { db, genId };
