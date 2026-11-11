const fs = require('fs');
const https = require('https');
const path = require('path');

function getDeepSeekKey() {
  try {
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.startsWith('DEEPSEEK_API_KEY=')) {
          let val = line.substring('DEEPSEEK_API_KEY='.length).trim();
          val = val.replace(/^["']|["']$/g, '').trim();
          return val;
        }
      }
    }
  } catch (e) {}
  return (process.env.DEEPSEEK_API_KEY || '').replace(/^["']|["']$/g, '').trim();
}

async function run() {
  const apiKey = getDeepSeekKey();
  if (!apiKey) {
    console.error('No DEEPSEEK_API_KEY found');
    return;
  }

  const prompt = `You are DeepSeek V4 Pro, the mathematical & 3D kinematics engine for Gaming Kwanjai.
We need your exact mathematical formulas and Three.js logic to fix 4 issues across all 4 race tracks:
1. INVERTED STEERING FIX:
   On 3D road splines, why did steering invert (pressing left turns right)?
   Provide the correct formula for the road lateral normal vector (Right vector) using CatmullRomCurve3 tangent and world up vector (0, 1, 0) such that playerX in [-1, +1] is ALWAYS strictly right (+1) and left (-1) relative to the rider's viewpoint, across any 180-degree hairpin or loop.
2. SPEED SYNCHRONIZATION:
   How to mathematically synchronize linear velocity v (m/s), wheel angular speed omega_wheel (rad/s), crank cadence omega_crank (rad/s), and distance progression s(t) on a 3D CatmullRom spline so the visual scenery speed matches the speedometer exactly.
3. START & FINISH ARCHES:
   Formulas to construct 3D Start Arch and 3D Finish Arch with proper orientation (quaternion from tangent & normal) for both open circuits and closed loops.
4. MOUNTAIN & TERRAIN CLIPPING:
   Formula to place background mountains and foothills so they NEVER clip through the track corridor or overlap the player's camera.

Keep it mathematically rigorous, concise, and ready for Three.js implementation.`;

  console.log('Sending request to DeepSeek Reasoner...');
  const payload = JSON.stringify({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: 'You are DeepSeek V4 Pro, specialized in 3D Math, Spatial Kinematics, and WebGL/Three.js physics.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 1800
  });

  const req = https.request(
    {
      hostname: 'api.deepseek.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    },
    (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            console.error('DeepSeek API Error:', parsed.error);
            return;
          }
          const reply = parsed.choices[0].message.content;
          fs.writeFileSync(path.resolve(__dirname, 'deepseek_racing_fix_response.md'), reply, 'utf-8');
          console.log('DeepSeek V4 Pro response successfully saved to deepseek_racing_fix_response.md');
        } catch (e) {
          console.error('Error parsing response:', e, data);
        }
      });
    }
  );

  req.on('error', err => console.error('Request error:', err));
  req.write(payload);
  req.end();
}

run();
