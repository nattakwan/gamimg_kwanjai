/**
 * Helper script to query DeepSeek Reasoner (R1) for procedural 3D math & Three.js geometries.
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

async function queryDeepSeekR1(prompt) {
  const apiKey = getDeepSeekKey();
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY not found in .env');
  }

  const payload = JSON.stringify({
    model: 'deepseek-reasoner',
    messages: [
      {
        role: 'system',
        content:
          'You are DeepSeek Reasoner (R1), an expert in 3D procedural geometry, kinematics, spatial coordinates, and Three.js mathematics for stylized vocational simulations.',
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
              resolve({
                reasoning: data.choices[0].message.reasoning_content || '',
                content: data.choices[0].message.content || '',
              });
            } else {
              reject(new Error(`API Error: ${body}`));
            }
          } catch (err) {
            reject(err);
          }
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// CLI usage if run directly
if (require.main === module) {
  const prompt = process.argv.slice(2).join(' ') || 'Provide procedural 3D math and coordinates for a Three.js stylized DC motor with rotating shaft and 12-tooth brass gear.';
  console.log('Sending query to DeepSeek Reasoner (R1)...');
  queryDeepSeekR1(prompt)
    .then((result) => {
      console.log('=== DeepSeek R1 Reasoning ===');
      console.log(result.reasoning.substring(0, 500) + '...\n');
      console.log('=== DeepSeek R1 Solution ===');
      console.log(result.content);
    })
    .catch((err) => {
      console.error('Error querying DeepSeek R1:', err.message);
    });
}

module.exports = { queryDeepSeekR1 };

