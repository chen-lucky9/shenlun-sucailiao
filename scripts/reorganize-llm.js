// 用 DeepSeek 按 11 维度重新整理数据库中已有素材（需配置 DEEPSEEK_API_KEY）
import { db } from '../src/db.js';
import { llmEnabled, organizeWithLLM } from '../src/llm-organizer.js';

if (!llmEnabled()) {
  console.error('未配置 DEEPSEEK_API_KEY（或 LLM_API_KEY），无法调用 DeepSeek。');
  console.error('PowerShell 示例：$env:DEEPSEEK_API_KEY="sk-..."');
  process.exit(1);
}

const rows = db.prepare('SELECT * FROM materials ORDER BY id').all();
const upd = db.prepare(
  `UPDATE materials SET core_view=?, golden_sentences=?, argument_structure=?, topics=?, writing_angles=?, summary=?, organized_by=? WHERE id=?`
);

let ok = 0, fail = 0;
for (const r of rows) {
  try {
    const a = await organizeWithLLM({
      title: r.title,
      column: r.column_name,
      date: r.publish_date,
      source: r.source,
      url: r.source_url,
      content: r.original_content,
    });
    upd.run(
      a.core_view,
      JSON.stringify(a.golden_sentences),
      a.argument_structure,
      JSON.stringify(a.topics),
      JSON.stringify(a.writing_angles),
      a.summary,
      'deepseek',
      r.id
    );
    ok++;
    console.log(`✓ ${r.id} ${r.title}`);
  } catch (e) {
    fail++;
    console.error(`✗ ${r.id} ${r.title}: ${e.message}`);
  }
  await new Promise((res) => setTimeout(res, 600)); // 限速，避免触发 API 频率限制
}
console.log(`\n完成：成功 ${ok}，失败 ${fail}`);
