const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const appDataDir = path.join(os.homedir(), '.gemini', 'antigravity');
const syncDir = path.join(__dirname, '..', '.antigravity_chat_sync');

console.log('[Chat Import] Importing conversations from:', syncDir);
console.log('             to local Antigravity:', appDataDir);

if (!fs.existsSync(syncDir)) {
  console.error('[Chat Import] Error: Sync directory not found at', syncDir);
  process.exit(1);
}

fs.mkdirSync(path.join(appDataDir, 'conversations'), { recursive: true });
fs.mkdirSync(path.join(appDataDir, 'brain'), { recursive: true });
fs.mkdirSync(path.join(appDataDir, 'chapter_titles'), { recursive: true });

const robocopy = (src, dest, extra = '') => {
  try {
    execSync(`robocopy "${src}" "${dest}" ${extra}`, { stdio: 'ignore' });
  } catch (err) {
    if (!err.status || err.status > 3) {
      console.warn(`Robocopy warning from ${src} to ${dest}`);
    }
  }
};

robocopy(path.join(syncDir, 'conversations'), path.join(appDataDir, 'conversations'), '*.*');
robocopy(path.join(syncDir, 'chapter_titles'), path.join(appDataDir, 'chapter_titles'), '*.*');
robocopy(path.join(syncDir, 'brain'), path.join(appDataDir, 'brain'), '/E');

const rootFiles = ['conversation_summaries.db', 'conversation_summaries.db-shm', 'conversation_summaries.db-wal', 'agyhub_summaries_proto.pb'];
rootFiles.forEach(f => {
  const p = path.join(syncDir, f);
  if (fs.existsSync(p)) {
    fs.copyFileSync(p, path.join(appDataDir, f));
  }
});

console.log('[Chat Import] ✅ Conversations successfully restored to this PC!');
console.log('[Chat Import] 👉 Please restart or reload Antigravity IDE to view the conversations.');

