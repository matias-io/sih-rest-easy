// IDEs may export ELECTRON_RUN_AS_NODE for their own helpers. The app needs
// Electron's browser process even when launched from one of those terminals.
const { spawn } = require('node:child_process');
const path = require('node:path');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.resolve(__dirname, '..'), ...process.argv.slice(2)], {
  env, stdio: 'inherit'
});

const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];
const forwarders = signals.map((signal) => {
  const forward = () => child.kill(signal);
  process.on(signal, forward);
  return forward;
});
const cleanup = () => signals.forEach((signal, i) => process.removeListener(signal, forwarders[i]));

child.once('error', (error) => {
  cleanup();
  console.error('Could not launch Rest Easy:', error.message);
  process.exitCode = 1;
});
child.once('exit', (code, signal) => {
  cleanup();
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
