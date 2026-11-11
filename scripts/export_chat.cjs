const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const appDataDir = path.join(os.homedir(), '.gemini', 'antigravity');
const syncDir = path.join(__dirname, '..', '.antigravity_chat_sync');

console.log('[Chat Export] Exporting conversations from:', appDataDir);
console.log('             to sync directory:', syncDir);

if (!fs.existsSync(appDataDir)) {
  console.error('[Chat Export] Error: Antigravity directory not found at', appDataDir);
  process.exit(1);
}

fs.mkdirSync(path.join(syncDir, 'conversations'), { recursive: true });
fs.mkdirSync(path.join(syncDir, 'brain'), { recursive: true });
fs.mkdirSync(path.join(syncDir, 'chapter_titles'), { recursive: true });

// Copy conversation databases & summaries
const robocopy = (src, dest, extra = '') => {
  try {
    execSync(`robocopy "${src}" "${dest}" ${extra}`, { stdio: 'ignore' });
  } catch (err) {
    if (!err.status || err.status > 3) {
      console.warn(`Robocopy warning from ${src} to ${dest}`);
    }
  }
};

robocopy(path.join(appDataDir, 'conversations'), path.join(syncDir, 'conversations'), '*.*');
robocopy(path.join(appDataDir, 'chapter_titles'), path.join(syncDir, 'chapter_titles'), '*.*');
robocopy(path.join(appDataDir, 'brain'), path.join(syncDir, 'brain'), '/E');

// Copy summary db files
const rootFiles = ['conversation_summaries.db', 'conversation_summaries.db-shm', 'conversation_summaries.db-wal', 'agyhub_summaries_proto.pb'];
rootFiles.forEach(f => {
  const p = path.join(appDataDir, f);
  if (fs.existsSync(p)) {
    fs.copyFileSync(p, path.join(syncDir, f));
  }
});

console.log('[Chat Export] ✅ Conversations successfully exported to .antigravity_chat_sync!');

