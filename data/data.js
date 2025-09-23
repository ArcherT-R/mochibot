const fs = require('fs');
const path = require('path');

// Paths
const LINKED_PATH = path.join(__dirname, 'linkedUsers.json');
const REMINDERS_PATH = path.join(__dirname, 'reminders.json');
const TRANSCRIPTS_DIR = path.join(__dirname, 'transcripts-files');

// Ensure transcripts folder exists
if (!fs.existsSync(TRANSCRIPTS_DIR)) fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });

// Load JSON
function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`Error loading JSON from ${filePath}:`, err);
    return {};
  }
}

// Save JSON
function saveJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Error saving JSON to ${filePath}:`, err);
  }
}

// Linked users
function loadLinkedUsers() {
  return loadJson(LINKED_PATH);
}
function saveLinkedUsers(data) {
  saveJson(LINKED_PATH, data);
}

// Reminders
function loadReminders() {
  return loadJson(REMINDERS_PATH);
}
function saveReminders(data) {
  saveJson(REMINDERS_PATH, data);
}

// Transcripts
function saveTranscript(channelName, html) {
  const fileName = `transcript-${channelName}-${Date.now()}.html`;
  const filePath = path.join(TRANSCRIPTS_DIR, fileName);
  try {
    fs.writeFileSync(filePath, html);
    return fileName;
  } catch (err) {
    console.error('Error saving transcript:', err);
    return null;
  }
}

module.exports = {
  LINKED_PATH,
  REMINDERS_PATH,
  TRANSCRIPTS_DIR,
  loadLinkedUsers,
  saveLinkedUsers,
  loadReminders,
  saveReminders,
  saveTranscript
};
