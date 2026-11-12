const fs = require('fs');

async function main() {
  const envText = fs.readFileSync('.env', 'utf-8');
  const match = envText.match(/DEEPSEEK_API_KEY=(.*)/);
  if (!match) throw new Error('No API key found in .env');
  const apiKey = match[1].replace(/^["']|["']$/g, '').trim();

  const prompt = `You are DeepSeek V4 Pro, the lead 3D math, physics, and gameplay balance engine specialist for Gaming Kwanjai (a vocational electric bicycle racing game in Three.js/React).

USER REQUIREMENT:
"โหมดแข่งขันในทุกสนามให้เพิ่ม item การวิ่งเก็บของเพื่อเพิ่มพลังงานแบตเตอรี่ โดยกำหนดปริมาณแบตเริ่มต้นสัก 50% เก็บ item ให้พลังงานละ 5-10% ให้คำนวณ item ตามระยะทางในแต่ละด่าน พิจารณาให้เหมาะสมกับการแข่งขัน อย่าลืมให้ใช้ deepseek ช่วยทำงาน"

Game Context:
- Initial starting battery charge = 50% of totalCapacityMah (was 100%).
- Each collected item grants +5% to +10% of total capacity (capped at 100%).
- There are 4 distinct race stages:
  1. flat_sprint: 400m, 1 lap. High speed highway sprint (~35-45s duration).
  2. hill_climb: 600m, 1 lap. Undulating mountain highway (+14% climb, -9% valley, +16% summit switchbacks). Heavy motor drain; player stalls if battery runs dry.
  3. endurance_route: 1,200m total (3 laps of 400m closed circuit). Long distance endurance race.
  4. offroad_downhill: 800m, 1 lap. Downhill canyon descent with jumps and KERS regenerative braking.

Current Game Architecture:
- Road width: ROAD_HALF_WIDTH = 3.2m (6.4m total width).
- Player lateral steering: playerX ranges from -1.0 (left curb) to +1.0 (right curb).
- Single 60 FPS Game Loop in RacingScreen.tsx with authoritative simRef.
- 3D Renderer in Racing3DRenderer.ts with Catmull-Rom track points, sampledPositions, sampledTangents, sampledNormals.

Please provide a complete, mathematically balanced specification and code implementation for:
1. STAGE ITEM BUDGET & SPATIAL DISTRIBUTION:
   - For each of the 4 stages, determine:
     - Exact number of pickup items (N).
     - Distance z along track for each item (in meters).
     - Lateral offset x for each item (-0.8 to +0.8) to encourage strategic racing lines (apex of curves, straightaway slaloms).
     - Battery energy % granted per item (e.g. 6% to 8%).
     - Mathematical balance: calculate starting energy (50%) + consumption vs collected energy, showing how a player who collects items can maintain aggressive boost to the finish line, while ignoring items forces human pedaling or risks hill stalls.
     - For multi-lap endurance_route (3 laps of 400m), specify how items behave per lap (respawning each lap or fixed world items per lap).

2. 3D VISUAL ASSET & ANIMATIONS (Three.js):
   - Design a high-tech, glowing Procedural 3D Battery Pickup Mesh:
     - E.g. A glowing futuristic 18650/21700 battery cell with brass terminals + pulsing energy ring / aura.
     - Materials (emissive glow, cyan/emerald energy color).
     - Per-frame animation: continuous Y-rotation and vertical bobbing (floating 0.6m - 0.9m above the road surface).
     - Collection visual effect: burst/fade when picked up.

3. COLLISION / HITBOX MATH:
   - Precise 3D cylinder or bounding box check between cyclist (playerZ, playerX) and items:
     - Longitudinal tolerance |playerZ - itemZ| <= dz.
     - Lateral tolerance |playerX - itemX| <= dx.
   - Clean pickup state tracking in simRef without causing React re-render spikes.

4. SOUND & HUD NOTIFICATION:
   - Sound trigger (e.g. pleasant ascending chime / power-up tone).
   - Instant visual popup "+8% BATTERY (⚡ +320 mAh)" in the cockpit HUD.

Please provide concise, production-ready TypeScript code and clear mathematical justification for the item placements.`;

  console.log('Sending request to DeepSeek API...');
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 4000
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const reply = data.choices[0].message.content;
  console.log('DeepSeek V4 Pro Response received! Saving to scripts/deepseek_battery_items_response.md...');
  fs.writeFileSync('scripts/deepseek_battery_items_response.md', reply, 'utf-8');
  console.log('Saved successfully.');
}

main().catch(console.error);

