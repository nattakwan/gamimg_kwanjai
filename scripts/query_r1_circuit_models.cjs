const fs = require('fs');
const https = require('https');
const path = require('path');

function getDeepSeekKey() {
  try {
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const match = content.match(/DEEPSEEK_API_KEY=["']?([^"'\r\n]+)/);
      if (match) return match[1];
    }
  } catch (e) {}
  return process.env.DEEPSEEK_API_KEY || '';
}

const prompt = `You are DeepSeek Reasoner (R1). Please compute the exact procedural Three.js 3D geometry coordinates, meshes, materials, and hierarchy for 6 realistic laboratory electrical components shown in the project reference photo:

1) AA BATTERY 1.5V (ถ่าน AA 1.5V):
   - Proportions: Cylinder height 4.8, radius 0.72.
   - Upper jacket (height 1.4, Y: +1.0 to +2.4): Electric blue (hex #0284c7) with bold black "+" positive decal/mesh.
   - Lower jacket (height 3.4, Y: -2.4 to +1.0): Deep matte black (hex #18181b).
   - Top cap: Silver metallic beveled ring with circular groove recession, and a central raised nickel contact nub (radius 0.22, height 0.25).
   - Bottom base: Flat circular metallic silver negative contact plate.

2) MINIATURE E10 SCREW BASE LIGHT BULB (หลอดไฟ):
   - Glass globe: Transparent spherical/teardrop bulb (radius 0.65) using MeshPhysicalMaterial (transmission: 0.96, roughness: 0.05, ior: 1.5).
   - Interior filament: Coiled tungsten filament between two thin nickel support posts, with a central PointLight and warm emissive glow (hex #fef08a) when lit.
   - Screw base: Threaded metallic cylinder (E10 ridges using grooved lathe or torus rings, shiny aluminum/nickel #cbd5e1).
   - Bottom insulator & tip: Black insulator ring with central silver solder contact bead at the very bottom.

3) MABUCHI 130 HOBBY DC MOTOR (มอเตอร์ DC):
   - Can housing: Flat-sided oval/rounded rectangular steel can (width 1.5, height 1.1, length 2.0) with brushed steel metalness (shininess 85, color #d4d4d8).
   - Front face: Raised circular brass/bronze bearing boss (radius 0.35, length 0.25) with horizontal steel output shaft (radius 0.08, length 1.2) spinning around Z axis.
   - Front vent holes & side notch details.
   - Rear end-cap: Light grey/white plastic end-bell with two protruding copper/brass solder connection terminals (tabs).

4) ALLIGATOR CLIP TEST LEADS (สายไฟ + ปากคีบจระเข้):
   - Wire body: Catmull-Rom tube spline between connection endpoints with customizable color (red #ef4444, black #18181b, blue #3b82f6).
   - Alligator Clip at each end:
     - Flexible molded vinyl/rubber protective boot/sleeve (color-coded, tapered cylinder).
     - Stamped metal upper and lower crocodile jaws with interlocking serrated teeth.
     - Central pivot rivet and torsion spring.

5) INDUSTRIAL HEAVY-DUTY TOGGLE SWITCH (สวิตซ์):
   - Base enclosure: Matte black rectangular box (width 2.8, depth 1.4, height 1.2, hex #1e293b).
   - Mounting plate: Beveled plate with mounting flange screw holes.
     - Left side: Matte dark surface embossed with "OFF".
     - Right side: Bold red rectangular plate area with crisp white "ON".
   - Central collar: Shiny threaded cylinder with a hexagonal locking nut and an internal glowing blue LED indicator ring.
   - Bat toggle lever: Polished chrome metal bat lever (tapered cylinder to rounded ball tip) that pivots smoothly ±28 degrees between OFF and ON.

6) DIGITAL MULTIMETER 3D (มัลติมิเตอร์):
   - Holster: Ergonomic safety-yellow rubber holster casing (hex #facc15) with side grip grooves and bevels (width 2.2, height 3.6, depth 0.9).
   - Display: Large LCD screen with dark bezel, showing digital reading (e.g. "00.0" or measured voltage "1.50 V").
   - Rotary selector dial: Large circular black knob with pointer notch and range markings (OFF, V=, V~, mA, Ω).
   - 4 input jack sockets: 10A, mA, COM, V/Ω.
   - Dual test probes: Red and black probe handles with pointed metal needle tips and flexible coiled leads plugged into the meter jacks.

Please provide concise, complete, production-ready Three.js procedural construction functions for each of these 6 components.`;

async function main() {
  const apiKey = getDeepSeekKey();
  if (!apiKey) {
    console.error('ERROR: DEEPSEEK_API_KEY not found');
    process.exit(1);
  }

  console.log('Sending procedural 3D model query to DeepSeek Reasoner (R1)...');

  const payload = JSON.stringify({
    model: 'deepseek-reasoner',
    messages: [
      {
        role: 'system',
        content:
          'You are DeepSeek Reasoner (R1), an expert in 3D procedural modeling, Three.js geometries, kinematics, and spatial mathematics.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const req = https.request(
    {
      hostname: 'api.deepseek.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 180000,
    },
    (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            console.error('API Error:', json.error);
            process.exit(1);
          }
          const choice = json.choices && json.choices[0];
          const reasoning = choice?.message?.reasoning_content || '';
          const content = choice?.message?.content || '';

          const outPath = path.resolve(__dirname, 'r1_circuit_models_output.json');
          fs.writeFileSync(outPath, JSON.stringify({ reasoning, content }, null, 2));
          console.log('SUCCESS! DeepSeek R1 models saved to:', outPath);
        } catch (e) {
          console.error('JSON Parse error:', e, data);
        }
      });
    }
  );

  req.on('error', (err) => {
    console.error('Request error:', err);
  });

  req.write(payload);
  req.end();
}

main();
