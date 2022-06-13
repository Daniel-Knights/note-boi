import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const packagePath = path.join('.', 'package.json');
const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const tauriConfPath = path.join('.', 'src-tauri', 'tauri.conf.json');
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));

const versionSections = packageData.version.split('.');

switch (process.argv[2]) {
  case 'major':
    versionSections[0] = (parseInt(versionSections[0], 10) + 1).toString();
    versionSections[1] = '0';
    versionSections[2] = '0';
    break;
  case 'minor':
    versionSections[1] = (parseInt(versionSections[1], 10) + 1).toString();
    versionSections[2] = '0';
    break;
  case 'patch':
    versionSections[2] = (parseInt(versionSections[2], 10) + 1).toString();
    break;
  default:
    console.error(`Invalid version type: '${process.argv[2]}'`);
    process.exit(1);
}

tauriConf.package.version = `${versionSections[0]}.${versionSections[1]}.${versionSections[2]}`;

fs.writeFileSync(tauriConfPath, `${JSON.stringify(tauriConf, null, 2)}\n`);

execSync(
  `git add . && git commit -m "ci: bump tauri version to v${tauriConf.package.version}"`
);
