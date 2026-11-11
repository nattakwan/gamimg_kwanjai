const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const sourceDir = 'e:\\gittest\\gamimg_kwanjai';
const targetDir = 'C:\\Users\\natta\\OneDrive\\RMUTL\\Gaming';

console.log(`[OneDrive Sync] Synchronizing from ${sourceDir} -> ${targetDir}...`);

try {
  // Ensure target exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Robocopy mirror/sync excluding node_modules, .vite, dist
  // Exit codes 0-3 in robocopy mean success (0 = no change, 1 = files copied, 2 = extras, 3 = files copied + extras)
  const cmd = `robocopy "${sourceDir}" "${targetDir}" /E /XD node_modules .vite dist`;
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (err) {
    if (err.status && err.status <= 3) {
      // Normal successful Robocopy exit code
    } else {
      throw err;
    }
  }

  console.log('\n[OneDrive Sync] ✅ Successfully updated all files to OneDrive:');
  console.log(`               -> ${targetDir}`);
} catch (error) {
  console.error('\n[OneDrive Sync] ❌ Error syncing to OneDrive:', error.message);
  process.exit(1);
}

