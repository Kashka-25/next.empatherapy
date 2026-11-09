// Runs a Next.js command with the vision demo turned on (works on Windows and macOS/Linux).
// Usage: node scripts/with-demo.js dev | build | start
process.env.NEXT_PUBLIC_DEMO_MODE = '1';
const { spawn } = require('child_process');
const next = require.resolve('next/dist/bin/next');
const child = spawn(process.execPath, [next, ...process.argv.slice(2)], { stdio: 'inherit', env: process.env });
child.on('exit', (code) => process.exit(code ?? 0));
