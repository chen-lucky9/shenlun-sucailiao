// 验证复盘提示词能从 md 中正确提取
import { reviewPrompt } from '../src/prompts.js';
const p = reviewPrompt();
console.log('prompt length=', p.length);
console.log('--- first 160 chars ---');
console.log(p.slice(0, 160));
