const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.join(__dirname, '..', 'packages', 'server', '.env');
let envRaw = '';
try {
  envRaw = fs.readFileSync(envPath, 'utf8');
} catch (e) {
  console.error('Failed to read .env at', envPath, e.message);
  process.exit(2);
}
const m = envRaw.match(/^JWT_SECRET=(.*)$/m);
const secret = (m && m[1]) || 'dev-secret-change-me';

const base64url = s => Buffer.from(s).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
const payload = base64url(JSON.stringify({ sub: 'test-user', iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + 86400, role: 'test' }));
const signature = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
console.log(`${header}.${payload}.${signature}`);
