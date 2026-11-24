// 轻量 Markdown 渲染（标题/表格/列表/引用/加粗/代码），供方法库页面使用
(function () {
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function inlineMd(s) {
    let x = escapeHtml(s);
    x = x.replace(/`([^`]+)`/g, '<code>$1</code>');
    x = x.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    x = x.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
    return x;
  }
  function renderMarkdown(md) {
    const lines = String(md).replace(/\r\n/g, '\n').split('\n');
    const out = [];
    let i = 0;
    let inCode = false;
    let codeBuf = [];
    const flushCode = () => {
      if (codeBuf.length) {
        out.push('<pre class="md-code"><code>' + escapeHtml(codeBuf.join('\n')) + '</code></pre>');
        codeBuf = [];
      }
    };
    while (i < lines.length) {
      const line = lines[i];
      if (/^```/.test(line.trim())) {
        if (inCode) { flushCode(); inCode = false; } else { inCode = true; }
        i++;
        continue;
      }
      if (inCode) { codeBuf.push(line); i++; continue; }

      if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
        const header = line.trim().replace(/^\||\|$/g, '').split('|').map((s) => s.trim());
        i += 2;
        const rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
          rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|').map((s) => s.trim()));
          i++;
        }
        out.push('<div class="md-table-wrap"><table class="md-table"><thead><tr>' + header.map((h) => '<th>' + inlineMd(h) + '</th>').join('') + '</tr></thead><tbody>' + rows.map((r) => '<tr>' + r.map((c) => '<td>' + inlineMd(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>');
        continue;
      }

      const h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) {
        const level = Math.min(4, h[1].length);
        out.push('<h' + level + ' class="md-h">' + inlineMd(h[2]) + '</h' + level + '>');
        i++;
        continue;
      }

      if (/^>\s?/.test(line)) {
        const buf = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
        out.push('<blockquote class="md-quote">' + buf.map(inlineMd).join('<br>') + '</blockquote>');
        continue;
      }

      if (/^\s*[-*+]\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*+]\s+/, '')); i++; }
        out.push('<ul class="md-ul">' + items.map((it) => '<li>' + inlineMd(it) + '</li>').join('') + '</ul>');
        continue;
      }

      if (/^\s*\d+[.、)]\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*\d+[.、)]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+[.、)]\s+/, '')); i++; }
        out.push('<ol class="md-ol">' + items.map((it) => '<li>' + inlineMd(it) + '</li>').join('') + '</ol>');
        continue;
      }

      if (!line.trim()) { i++; continue; }

      const buf = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,4})\s+|^>\s?|^\s*[-*+]\s+|^\s*\d+[.、)]\s+|^\s*\|.*\|\s*$|^```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      out.push('<p class="md-p">' + buf.map(inlineMd).join('<br>') + '</p>');
    }
    flushCode();
    return out.join('');
  }
  window.renderMarkdown = renderMarkdown;
})();
