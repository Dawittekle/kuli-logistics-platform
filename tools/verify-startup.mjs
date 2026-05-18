import { spawn } from 'node:child_process';

const startupTimeoutMs = 12000;

const runToCompletion = (name, command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';

    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`verify: ${name} booted`);
        resolve();
        return;
      }

      reject(new Error(`${name} exited with ${code}\n${output}`));
    });
  });

const waitForOutput = (name, command, args, expectedOutput) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        MONGODB_SERVER_SELECTION_TIMEOUT_MS: process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS ?? '5000'
      }
    });

    let output = '';
    let settled = false;

    const stopChild = () => {
      if (!child.killed) {
        child.kill('SIGTERM');
      }
    };

    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      stopChild();
      reject(new Error(`${name} did not report startup within ${startupTimeoutMs}ms\n${output}`));
    }, startupTimeoutMs);

    const handleOutput = (chunk) => {
      output += chunk.toString();

      if (!settled && output.includes(expectedOutput)) {
        settled = true;
        clearTimeout(timeout);
        stopChild();
        console.log(`verify: ${name} booted`);
        resolve();
      }
    };

    child.stdout.on('data', handleOutput);
    child.stderr.on('data', handleOutput);
    child.on('error', (error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(error);
      }
    });
    child.on('close', (code) => {
      if (!settled && code !== 0) {
        settled = true;
        clearTimeout(timeout);
        reject(new Error(`${name} exited with ${code}\n${output}`));
      }
    });
  });

await runToCompletion('admin placeholder', 'node', ['apps/admin/src/main.mjs']);
await runToCompletion('mobile placeholder', 'node', ['apps/mobile/src/main.mjs']);
await waitForOutput('api', 'node', ['apps/api/src/main.mjs'], '@kuli/api listening');

console.log('verify: all Phase 0 app startup checks passed');
