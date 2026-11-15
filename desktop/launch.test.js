const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function launch() {
  const child = new EventEmitter();
  const forwarded = [];
  child.kill = (signal) => { forwarded.push(signal); return true; };
  const parent = new EventEmitter();
  Object.assign(parent, {
    env: { ELECTRON_RUN_AS_NODE: '1', REST_EASY_SMOKE: '1', PATH: '/bin' },
    argv: ['node', '/project/desktop/launch.js', '--enable-logging'],
    pid: 1234,
    kill: (pid, signal) => { parent.termination = { pid, signal }; }
  });
  let spawned;
  const errors = [];
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'launch.js'), 'utf8'), {
    __dirname: '/project/desktop', process: parent,
    console: { error: (...args) => errors.push(args) },
    require: (name) => {
      if (name === 'electron') return '/electron/Electron';
      if (name === 'node:path') return path;
      if (name === 'node:child_process') return { spawn: (...args) => { spawned = args; return child; } };
      throw new Error('Unexpected dependency: ' + name);
    }
  });
  return { child, parent, forwarded, spawned, errors };
}

test('launches Electron from any working directory without inherited Node mode', () => {
  const { spawned: [executable, args, options], parent } = launch();
  assert.equal(executable, '/electron/Electron');
  assert.deepEqual(Array.from(args), [path.resolve('/project'), '--enable-logging']);
  assert.equal(options.stdio, 'inherit');
  assert.equal(Object.hasOwn(options.env, 'ELECTRON_RUN_AS_NODE'), false);
  assert.equal(options.env.REST_EASY_SMOKE, '1');
  assert.equal(options.env.PATH, '/bin');
  assert.equal(parent.env.ELECTRON_RUN_AS_NODE, '1');
});

test('forwards termination signals and preserves Electron exit status', () => {
  const { child, parent, forwarded } = launch();
  parent.emit('SIGINT'); parent.emit('SIGTERM'); parent.emit('SIGHUP');
  assert.deepEqual(forwarded, ['SIGINT', 'SIGTERM', 'SIGHUP']);
  child.emit('exit', 17, null);
  assert.equal(parent.exitCode, 17);
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) assert.equal(parent.listenerCount(signal), 0);
});

test('preserves a signal exit and reports executable launch failures', () => {
  const signaled = launch();
  signaled.child.emit('exit', null, 'SIGTERM');
  assert.deepEqual(signaled.parent.termination, { pid: 1234, signal: 'SIGTERM' });
  const failed = launch();
  failed.child.emit('error', new Error('spawn ENOENT'));
  assert.equal(failed.parent.exitCode, 1);
  assert.match(failed.errors.flat().join(' '), /spawn ENOENT/);
  assert.equal(failed.parent.listenerCount('SIGTERM'), 0);
});
