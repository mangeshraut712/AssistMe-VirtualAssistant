import { resolveAllowedOrigin } from '../cors.js';

const cases = [
  ['https://assist-me-virtual-assistant.vercel.app', true],
  ['https://assist-me-virtual-assistant-git-fix-cors-team.vercel.app', false],
  ['https://assist-me-virtual-assistant-git-fix-cors-mangeshraut712.vercel.app', true],
  ['https://assist-me-virtual-assistant-git-my-feature-mangeshraut712.vercel.app', true],
  ['https://assist-me-virtual-assistant-abc123.vercel.app', false],
  ['https://assist-me-virtual-assistant-my-feature.vercel.app', false],
  ['https://assist-me-virtual-assistant-.vercel.app', false],
  ['https://assist-me-virtual-assistant-Evil.vercel.app', false],
  ['https://evil-assist-me-virtual-assistant.vercel.app', false],
  ['https://assist-me-virtual-assistant.evil.vercel.app', false],
  ['https://assist-me-virtual-assistant-git-x-otherteam.vercel.app', false],
];
let failed = 0;
for (const [origin, ok] of cases) {
  const got = resolveAllowedOrigin(origin);
  const allowed = got === origin;
  if (allowed !== ok) {
    console.error('FAIL', origin, 'expected', ok, 'got', got);
    failed += 1;
  }
}
if (failed) process.exit(1);
console.log('ok', cases.length);
