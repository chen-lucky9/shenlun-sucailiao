// 生成单文件离线版 dist/shenlun-offline.html
import { buildSingleFile } from '../src/staticbuild.js';
const r = buildSingleFile();
console.log(`✓ 单文件离线版已生成：${r.file}（${r.sizeKb} KB）`);
console.log('  可直接用微信/邮件/AirDrop 发到手机，用浏览器打开，无需服务器与托管。');
