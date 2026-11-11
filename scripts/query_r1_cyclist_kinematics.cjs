/**
 * Query DeepSeek Reasoner (R1) for:
 * 1. Realistic Organic Cyclist Pedaling Kinematics (solving stiff posture: pelvic heave/roll, torso counter-sway, articulated arm push-pull, head stabilization)
 * 2. Dynamic Handlebar & Front Fork Steering Kinematics
 * 3. Natural Racing Chase Camera with Apex Look-Ahead, Lateral Spring Damping, and Horizon Banking
 */

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

async function queryR1() {
  const apiKey = getDeepSeekKey();
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY not found in .env');
  }

  const prompt = `
You are DeepSeek Reasoner (R1), an expert in 3D bicycle physics, skeletal kinematics, biomechanics, and Three.js camera dynamics.

The user has given this request for a 3D bicycle racing game:
"แก้การเคลื่อนไหวตอนแข่งจักรยานตอนกดปุ่มเลี้ยวซ้ายเลี้ยวขวา มุมมองการเคลื่อนที่จะต้องเป็นธรรมชาติ และตอนที่เราปั่นจักรยานท่าทางของเรายังทื้อๆอยู่ช่วยปรับแก้ให้สมจริงด้วยครับ"
(Fix the movement when steering/turning left and right - the motion and camera perspective must look natural. And while pedaling, the cyclist's posture still looks stiff/wooden - please adjust and fix it to look realistic and organic!)

Current implementation details in Three.js:
- Bicycle frame is built in rollPivot.
- The cyclist has rollPivot.rotation.z for banking.
- The front fork and handlebars are currently rigidly attached to the frame with NO steering yaw rotation!
- The rider currently has:
  * Pelvis fixed at static Vector3(0, 0.88, -0.18).
  * Torso fixed at static rotation.x = 48 deg.
  * Head fixed at static offset.
  * Arms are static single cylinders pinned rigidly from shoulder to handlebar.
  * Only legs move with 2-bone IK to pedals.
  * Because the pelvis, torso, shoulders, and arms are 100% frozen, the pedaling looks stiff, robotic, and wooden ("ทื้อๆ").
- The camera currently does:
  * camOffset = playerTangent * -8.2 + Y * 3.6 + playerNormal * player.x * 1.4.
  * camera.lookAt = playerPos + playerTangent * 6.0.
  * When steering left/right, the camera immediately translates laterally in lockstep, making steering feel rigid, unnatural, and jarring.

Please provide mathematical formulas, kinematic equations, and complete production-ready Three.js code for:
1. **Dynamic Handlebar & Front Wheel Steering Kinematics**:
   - Steer angle delta computed from lateral steering rate (dx/dt) and road curvature kappa.
   - Steer pivot (head tube axis) that rotates handlebars, stem, front fork, and front wheel around the steer axis.
2. **Realistic Organic Cyclist Pedaling Kinematics (solving the stiff posture)**:
   - Pelvis multi-axis dynamic sway as function of crankAngle theta:
     * Pelvic heave (vertical drop on downstrokes: -A_heave * |sin(theta)|)
     * Pelvic roll (tilting down toward the active power stroke side)
     * Pelvic yaw (slight hip rotation following the forward pedal)
   - Torso & Spine dynamic kinematics:
     * Torso counter-roll (balancing pelvic torque)
     * Torso pitch breathing/effort bobbing (flexing forward on power stomps)
     * Torso lateral sway
   - Articulated Arms Kinematics (with 2 segments: Upper Arm and Forearm / Elbow joint):
     * Shoulders moving with torso
     * Hands pinned to handlebars (which turn with steering)
     * Elbows flexing and pushing/pulling dynamically with pedaling power stroke
   - Head Gaze Stabilization:
     * Neck counter-rotating to keep rider's gaze forward along track with subtle rhythmic nod
   - Leg IK updated from the dynamically shifting hip joints to pedals.
3. **Natural Dynamic Chase Camera**:
   - Damped spring-arm follow: separate lateral smoothing to allow the bike to turn before the camera catches up
   - Apex Look-Ahead: camera lookTarget offsets into the curve/turn direction (yaw anticipation)
   - Horizon Banking / Dutch Roll: camera softly rolls with the bicycle lean for natural racing feel
   - Speed & Boost dynamic FOV

Provide clear, robust TypeScript / Three.js functions and formulas.
`;

  console.log('Sending request to DeepSeek Reasoner (R1)...');
  const payload = JSON.stringify({
    model: 'deepseek-reasoner',
    messages: [
      {
        role: 'system',
        content:
          'You are DeepSeek Reasoner (R1), expert in 3D physics, biomechanics, skeletal kinematics, and Three.js mathematics.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  return new Promise((resolve, reject) => {
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
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (data.choices && data.choices[0]) {
              const reasoning = data.choices[0].message.reasoning_content || '';
              const content = data.choices[0].message.content || '';
              console.log('Successfully received response from DeepSeek Reasoner (R1)!');
              fs.writeFileSync(
                path.resolve(__dirname, 'r1_cyclist_kinematics_output.json'),
                JSON.stringify({ reasoning, content }, null, 2),
                'utf-8'
              );
              console.log('Saved to scripts/r1_cyclist_kinematics_output.json');
              resolve({ reasoning, content });
            } else {
              reject(new Error('Invalid response structure: ' + body));
            }
          } catch (e) {
            reject(e);
          }
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

queryR1().catch((err) => {
  console.error('Error querying R1:', err);
  process.exit(1);
});

