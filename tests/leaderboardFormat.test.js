const fs = require('fs');
const path = require('path');

const indexSource = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
const canvasSource = fs.readFileSync(path.join(__dirname, '..', 'utils', 'leaderboardCanvas.js'), 'utf8');

const required = [
  'formatLeaderboardQuote',
  '<a:Desa_Tulus2:1518502350363430932>',
  'attachment://leaderboard.png',
  'generateLeaderboardImage',
  '<a:Desa_Tulus2:1518502350363430932> <a:Desa_Tulus2:1518502350363430932> DESA TULUS |',
  'Update otomatis setiap hari pukul **00.00 WIB**',
  'persistLeaderboardActiveMessageId'
];

for (const token of required) {
  if (!indexSource.includes(token) && !canvasSource.includes(token)) {
    throw new Error(`Missing leaderboard token: ${token}`);
  }
}

if (/Pemisah|\s>>\s/.test(indexSource.match(/function formatLeaderboardQuote[\s\S]*?function getLeaderboardActiveRows/)?.[0] || '')) {
  throw new Error('formatLeaderboardQuote must not use plain >> separator.');
}

for (const token of ['WIDTH = 1200', 'HEIGHT = 900', 'drawPodium', 'drawCircleAvatar', 'safeLoadImage', 'FALLBACK_ARROW']) {
  if (!canvasSource.includes(token)) throw new Error(`Missing canvas token: ${token}`);
}

console.log('✅ Leaderboard premium format test passed.');
