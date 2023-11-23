import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const args = process.argv.slice(2);

fs.rmSync('dist', { recursive: true, force: true });

function run(cmd: string, passedArgs: string[]): void {
  spawnSync(cmd, passedArgs, { stdio: 'inherit' });
}

run('pnpm', ['run', 'checks']);
run('pnpm', ['build']);
run('pnpm', ['version', args[0]]);
run('npx', ['changenog']);
run('git', ['add', '.']);

const pkg = await import('../package.json');

run('git', ['commit', '-m', `docs(changelog): v${pkg.default.version}`]);
run('git', ['push']);
run('git', ['push', '--tags']);
