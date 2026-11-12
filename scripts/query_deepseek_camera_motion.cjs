const fs = require('fs');

async function main() {
  const envText = fs.readFileSync('.env', 'utf-8');
  const match = envText.match(/DEEPSEEK_API_KEY=(.*)/);
  if (!match) throw new Error('No API key found in .env');
  const apiKey = match[1].replace(/^["']|["']$/g, '').trim();

  const prompt = `You are DeepSeek V4 Pro, the lead 3D math and graphics engine specialist for Gaming Kwanjai.
The user reports: "ภาพมันแทบไม่ขยับเลย" (The 3D image is practically not moving at all! When pedaling at 42-44 km/h, the screen looks completely static and frozen).

Look at what is happening:
In the 3D renderer:
1. Track: MX Offroad Downhill (800m).
Control points:
- (0, 65, 0) * 0.85351
- (35, 62, -50) * 0.85351
- (75, 49, -110) * 0.85351
Total arc length is 800m.

2. In getTrackPosition(gameZ, lateralX):
u = gameZ / 800;
floatIdx = u * 800; // TRACK_SAMPLES = 800
idx0 = floor(floatIdx);
pos = sampledPositions[idx0].lerp(sampledPositions[idx1], frac);
tangent = sampledTangents[idx0].lerp(sampledTangents[idx1], frac).normalize();
normal = sampledNormals[idx0].lerp(sampledNormals[idx1], frac).normalize();

3. In update():
cyclist.group.position.copy(position);
cyclist.group.lookAt(position.clone().add(tangent));

// Camera:
const camDist = 8.2;
const camHeight = 3.6;
const targetCamPos = playerPos.clone()
  .addScaledVector(playerTangent, -camDist)
  .add(new THREE.Vector3(0, camHeight, 0))
  .addScaledVector(playerNormal, this.smoothCamLateral * 1.35);

const targetLookAt = playerPos.clone()
  .addScaledVector(playerTangent, 6.5)
  .add(new THREE.Vector3(0, 0.9, 0))
  .addScaledVector(playerNormal, apexOffset + this.smoothCamLateral * 0.45);

this.smoothCamPos.lerp(targetCamPos, posAlpha);
this.smoothCamTarget.lerp(targetLookAt, lookAlpha);
this.camera.position.copy(this.smoothCamPos);
this.camera.lookAt(this.smoothCamTarget);

4. Road geometry:
ROAD_HALF_WIDTH = 5.5 (11m wide road!).
Road mesh is a single strip from asphaltLeft to asphaltRight with flat vertex colors (brown/beige [0.38, 0.26, 0.16]).
There are NO dashed center lines, NO lane markings, NO road texture scrolling, NO speed lines!

5. In React (RacingScreen.tsx):
There is an rAF loop in useEffect that has [playerZ, playerSpeedMps, raceTimeSeconds] in its dependency array!
Every frame it calls setPlayerZ, setPlayerSpeedMps, setRaceTimeSeconds.
When state changes, useEffect cleans up cancelAnimationFrame and remounts, resetting lastTickTimeRef to performance.now().

Diagnose and provide the exact mathematical and engineering fixes:
1. Why does the 3D scene look completely static / frozen even at 44 km/h?
2. How to fix the React game loop so dt is never crushed and runs smoothly from 0 to 800m until crossing the finish line?
3. How to fix the camera (distance, height, lookAt, FOV) so the bike feels fast, dynamic, and prominent on screen?
4. How to fix the road geometry (road width, animated/dashed center stripes, lane markings, roadside posts) to provide intense optical flow and speed sensation?
5. How to place mountains and remove immersion-breaking objects (like the grey blimp/pill) so the downhill descent looks breathtaking?
Provide complete, actionable code implementations.`;

  console.log('Sending prompt to DeepSeek API...');
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are DeepSeek V4 Pro, expert in Three.js, game physics, and 3D kinematics.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 4000
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const answer = data.choices[0].message.content;
  console.log('--- DeepSeek Response received ---');
  fs.writeFileSync('scripts/deepseek_camera_motion_response.md', answer);
  console.log('Saved to scripts/deepseek_camera_motion_response.md');
}

main().catch(err => console.error(err));

