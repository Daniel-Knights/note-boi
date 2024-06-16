import { spawnSync, SpawnSyncOptions } from 'node:child_process';
import fs from 'node:fs';

const args = process.argv.slice(2);

function run(
  cmd: string,
  passedArgs: string[],
  options: SpawnSyncOptions = { stdio: 'inherit' }
) {
  return spawnSync(cmd, passedArgs, options);
}

if (run('git', ['status', '-s'], { stdio: 'pipe' }).stdout.toString()) {
  throw new Error('Uncommitted changes in working tree.');
}

fs.rmSync('dist', { recursive: true, force: true });

// This is here purely to check the build works before triggering a release
run('pnpm', ['build']);
run('pnpm', ['version', args[0]]);
run('npx', ['changenog']);
run('git', ['add', '.']);

const pkg = await import('../package.json');

run('git', ['commit', '-m', `docs(changelog): v${pkg.default.version}`]);
run('git', ['push']);
run('git', ['push', '--tags']);
