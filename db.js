const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'pashu-vikas.json');

function load() {
  if (!fs.existsSync(FILE)) {
    return { farmers: [], doctors: [], buffaloes: [], visits: [], health_assessments: [] };
  }
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch (e) { return { farmers: [], doctors: [], buffaloes: [], visits: [], health_assessments: [] }; }
}

let data = load();

function persist() {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

let counter = 0;
function genId() {
  counter += 1;
  return Date.now().toString(36) + '-' + counter.toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function now() { return new Date().toISOString(); }

module.exports = { data, persist, genId, now };
