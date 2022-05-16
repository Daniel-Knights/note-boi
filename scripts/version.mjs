import fs from 'fs';
import path from 'path';

const packagePath = path.join('.', 'package.json');
const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const tauriConfPath = path.join('.', 'src-tauri', 'tauri.conf.json');
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));

tauriConf.package.version = packageData.version;

fs.writeFileSync(tauriConfPath, `${JSON.stringify(tauriConf, null, 2)}\n`);
