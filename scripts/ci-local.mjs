#!/usr/bin/env node
// Select the checks from the product's App and Server CI workflows.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const yarn = 'yarn';
const deadline = Date.now() + 240_000;

function run(binary, args, env = {}) {
  console.log(`ci-parity: ${path.basename(binary)} ${args.join(' ')}`);
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error('Local checks exceeded four minutes; retain the log and investigate the selected scope');
  const result = spawnSync(binary, args, {
    stdio: ['ignore', 'inherit', 'inherit'],
    env: { ...process.env, CI: 'true', ECHOBRIDGE_SKIP_DOTENV: '1', EXPO_NO_DOTENV: '1', ...env },
    timeout: remaining,
  });
  if (result.error || result.status !== 0) {
    throw Object.assign(new Error(`${path.basename(binary)} ${args.join(' ')} failed: ${result.error?.message || result.status || result.signal}`), { exitCode: result.status || 1 });
  }
}

try {
  const git = (args) => execFileSync('/usr/bin/git', args, { encoding: 'utf8' });
  const base = process.env.FARMSLOT_CI_BASE_REF || git(['merge-base', 'origin/main', 'HEAD']).trim();
  const files = [...new Set([
    ...git(['diff', '--name-only', '-z', base]).split('\0'),
    ...git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0'),
  ].filter(Boolean))];
  const dependency = files.some((file) => /^(package\.json|yarn\.lock|\.yarnrc\.yml|\.yarn\/)/.test(file));
  const appPrefixes = ['apps/echobridge/', 'packages/echobridgelib/', 'packages/echonative/', 'packages/contracts-typescript/'];
  const appFiles = files.filter((file) => appPrefixes.some((prefix) => file.startsWith(prefix)));
  const appCI = dependency || appFiles.length > 0 || files.includes('.github/workflows/app.yml') || files.some((file) => file.startsWith('services/server/src/utils/summary_templates/system/'));
  if (appCI) {
    // App types require the shared library's compiled exports.
    run(yarn, ['workspace', 'echobridgelib', 'build']);
    run(yarn, ['workspace', 'echobridge', 'typecheck']);
    run(yarn, ['workspace', 'echobridge', 'lint:baseline']);
    run(yarn, ['workspace', 'echobridge', 'lint:scripts']);
    run(yarn, ['workspace', 'echobridge', 'validate:sample-config']);
    const related = appFiles.filter((file) => /\.[cm]?[jt]sx?$/.test(file) && existsSync(file)).map((file) => path.resolve(file));
    if (related.length) run(yarn, ['workspace', 'echobridge', 'test', '--runInBand', '--watchAll=false', '--findRelatedTests', ...related, '--passWithNoTests']);
    else console.log('ci-parity: no changed app source; full app suite remains in CI');
  }
  const python = files.filter((file) => /^(services\/server|packages\/contracts-python|scripts\/datasets)\//.test(file) && file.endsWith('.py') && existsSync(file));
  if (python.length) run('python3', ['-m', 'py_compile', ...python]);
  if (files.some((file) => file.startsWith('services/server/'))) console.log('ci-parity: full server public suite remains in CI');

  console.log('ci-parity: PASS; native builds, devices, hosted services and deployment remain in CI');
} catch (error) {
  console.error(`ci-parity: ${error.message}`);
  process.exitCode = error.exitCode || 1;
}
