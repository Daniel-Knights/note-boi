import { spawnSync, SpawnSyncOptions } from 'node:child_process';
import fs from 'node:fs';
import readline from 'node:readline';

const args = process.argv.slice(2);

if (run('git', ['status', '-s'], { stdio: 'pipe' }).stdout.toString()) {
  throw new Error('Uncommitted changes in working tree.');
}

//// Main

fs.rmSync('dist', { recursive: true, force: true });

// This is here purely to check the build works before triggering a release
run('pnpm', ['build']);

run('pnpm', ['version', args[0]]);
run('npx', [
  'changenog',
  '--filter-preset=angular',
  '--filter-preset=angular-readme-only-docs',
]);

// Confirm changes
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('Review changes then press enter to continue...');

await new Promise<void>((res) => {
  rl.on('line', () => {
    rl.close();

    res();
  });
});

// Commit and push
const pkg = await import('../package.json');

run('git', ['add', '.']);
run('git', ['commit', '-m', `docs(changelog): v${pkg.default.version}`]);
run('git', ['push']);
run('git', ['push', '--tags']);

//// Helpers

function run(
  cmd: string,
  passedArgs: string[],
  options: SpawnSyncOptions = { stdio: 'inherit' }
) {
  return spawnSync(cmd, passedArgs, options);
}
