// 整理器核心：把单篇原文整理为 11 维度素材（供 种子导入 与 每日更新 复用）
export const TOPIC_LABELS = {
  law_enforcement: '行政执法',
  rural_revitalization: '乡村振兴',
  business_environment: '营商环境',
  sci_tech_innovation: '科技创新',
  green_development: '绿色发展',
  industrial_upgrading: '产业升级',
  digital_economy: '数字经济',
  cultural_confidence: '文化自信',
};

export const TOPIC_KEYS = Object.keys(TOPIC_LABELS);

const KEYWORDS = {
  law_enforcement: ['治理', '基层', '民生', '执法', '作风', '党建', '党组织', '党员', '干部', '群众', '窗口', '形式主义', '减负', '政绩观', '从严治党', '党性', '反腐', '权力', '法治', '司法', '规则', '网格', '社区', '办事', '审批', '政务', '服务', '民心', '担当', '监督'],
  rural_revitalization: ['乡村', '农村', '农业', '农民', '粮食', '丰收', '三农', '脱贫', '振兴', '耕地', '种业', '农机', '田野', '县域', '返乡', '惠农', '秋粮', '和美乡村', '帮扶'],
  business_environment: ['营商', '民营', '企业', '市场', '开放', '外贸', '出口', '消费', '投资', '统一大市场', '竞争', '服务贸易', '外资', '经营主体', '中小企业', '平台经济', '内需', '供需', '亚太', '自贸', '合作'],
  sci_tech_innovation: ['科技', '创新', '人才', '教育', '研发', '基础研究', '关键核心技术', '新质生产力', '自立自强', '实验室', '科学家', '工程师', '高技能', '技能人才', '产学研', '攻关', '科创', '精神能力', '人工智能时代'],
  green_development: ['生态', '绿色', '环保', '碳', '污染', '环境', '节能', '清洁能源', '风光', '减排', '绿水青山', '可持续', '排污', '蓝天', '碧水', '零碳', '环保为民'],
  industrial_upgrading: ['产业', '制造', '经济', '高质量发展', '实体', '供应链', '产业链', '未来产业', '工业', '装备', '转型', '升级', '新动能', '服务业', '供给', '动能', '工厂', '车间'],
  digital_economy: ['数字', '人工智能', '智能', '数据', '算力', '算法', '互联网', '数字化', '网络', '大模型', '智驾', '智能经济', '数实融合', '新基建', 'AI', '芯片'],
  cultural_confidence: ['文化', '文明', '非遗', '文博', '文旅', '博物馆', '传统', '文学', '艺术', '故事', '精神', '爱国主义', '红色', '长征', '国风', '审美', '阅读', '书香', '影视', '戏曲', '话剧', '诗歌', '文脉', '根魂'],
};

const OVERRIDES = [
  ['把丰收的底气攒得更足', ['rural_revitalization']],
  ['耕耘希望田野', ['rural_revitalization']],
  ['始终把生态环境保护挺在前头', ['green_development']],
  ['环保为民', ['green_development', 'law_enforcement']],
  ['人工智能时代，精神能力更加宝贵', ['sci_tech_innovation', 'digital_economy']],
  ['如何应对人工智能全球治理', ['digital_economy', 'sci_tech_innovation']],
  ['培养更多高技能人才', ['sci_tech_innovation']],
  ['打好科技强国建设攻坚战', ['sci_tech_innovation']],
  ['深圳校服', ['cultural_confidence', 'law_enforcement']],
  ['以“规则之治”守护网络舆论场', ['law_enforcement', 'digital_economy']],
  ['“大师”摘牌', ['law_enforcement', 'sci_tech_innovation']],
  ['“多说两句”的深意', ['law_enforcement']],
  ['面试“作业”不可越界', ['law_enforcement']],
  ['民心如镜长相映', ['law_enforcement']],
  ['抓住关键要害', ['law_enforcement']],
  ['极端低价不通吃', ['business_environment']],
  ['小零食何以做出大声量', ['industrial_upgrading', 'business_environment']],
  ['让更多中国故事跨越山海', ['cultural_confidence']],
  ['文化根魂何以铸', ['cultural_confidence']],
  ['落笔在生活的底稿', ['cultural_confidence']],
  ['文学，扎根群众', ['cultural_confidence']],
  ['纪念孙中山先生诞辰160周年大会上的讲话', ['cultural_confidence', 'law_enforcement']],
  ['在纪念中国工农红军长征胜利90周年大会上的讲话', ['cultural_confidence', 'law_enforcement']],
  ['携手共建亚太命运共同体', ['business_environment', 'cultural_confidence']],
  ['坚定信心，勇毅前行', ['business_environment']],
  ['欢迎晚宴上的祝酒辞', ['business_environment']],
  ['持续激发企业发展活力', ['business_environment', 'industrial_upgrading']],
  ['以政策协同破解供强需弱矛盾', ['business_environment', 'industrial_upgrading']],
  ['在激发社会活力中增强高质量发展动力', ['industrial_upgrading', 'business_environment']],
  ['着力提高干部队伍现代化建设本领', ['law_enforcement', 'sci_tech_innovation']],
  ['从“四大挑战”', ['law_enforcement']],
  ['增强党性是全面从严治党的根本性任务', ['law_enforcement']],
  ['把党组织建在守边护边一线', ['law_enforcement']],
  ['吉林以省级示范班', ['law_enforcement']],
  ['安徽分层分类开展党员专题培训', ['law_enforcement']],
  ['雪域羌塘党旗红', ['law_enforcement']],
  ['练出“巧身段”', ['industrial_upgrading']],
  ['乘“数”而上', ['digital_economy']],
  ['AI产业要造福不要造景', ['digital_economy', 'sci_tech_innovation']],
  ['“伪智能”需要真监管', ['digital_economy', 'law_enforcement']],
  ['以人工智能打开零售新空间', ['digital_economy', 'business_environment']],
  ['数实深度融合', ['digital_economy', 'industrial_upgrading']],
];

export function normalizeTitleColumn(title, column) {
  let t = (title || '').trim();
  let col = (column || '').trim();

  const bar = t.indexOf(' | ');
  if (bar !== -1) {
    const prefix = t.slice(0, bar).trim();
    const rest = t.slice(bar + 3).trim();
    if (prefix.length <= 22 && rest.length > 4) {
      col = prefix;
      t = rest;
    }
  }
  const m = t.match(/[（(]([^（）()]{2,24})[）)]\s*$/);
  if (m && /(人民时评|评论员观察|现场评论|纵横|大家谈|金台随笔|人民观点|连线评论员|微观|中国道路中国梦|人民论坛|和音|社论|评论|求是|先锋评论|党员教育|基层党建)/.test(m[1])) {
    if (!col) col = m[1].split('·')[0].trim();
    t = t.slice(0, m.index).trim();
  }
  if (!col) col = '评论';
  return { title: t, column: col };
}

export function splitSentences(text) {
  const out = [];
  for (const para of text.split(/\n+/)) {
    const t = para.replace(/\s+/g, '');
    if (!t) continue;
    for (const s of t.split(/(?<=[。！？；])/)) {
      const x = s.trim();
      if (x.length >= 4) out.push(x);
    }
  }
  return out;
}

const GOLDEN_MARKERS = ['必须', '要', '就是', '关键', '根本', '意味着', '只有', '越是', '不仅', '既', '才能', '关乎', '在于', '决定', '应当', '应', '让', '把', '是', '证明', '启示', '本质'];

export function extractGolden(content, n = 6) {
  const sents = splitSentences(content);
  const scored = sents
    .map((s) => {
      if (s.length < 14 || s.length > 80) return null;
      // 排除以分号/逗号/冒号结尾的未完整分句
      if (/[；、，,：:]$/.test(s)) return null;
      let score = 0;
      for (const mk of GOLDEN_MARKERS) if (s.includes(mk)) score += 1;
      if (s.length >= 20 && s.length <= 60) score += 2;
      if (/[“”"'「」]/.test(s)) score += 1;
      if (/[；、]/.test(s)) score += 1;
      return { s, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
  const out = [];
  const seen = new Set();
  for (const { s } of scored) {
    const key = s.replace(/[。！？；]+$/, '').replace(/\s/g, '');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= n) break;
  }
  return out;
}

export function firstThesis(content) {
  const paras = content.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const sents = splitSentences(paras[0] || '');
  const marker = /(必须|要|就是|关键|根本|意味着|在于|本质|核心|昭示|启示|告诉我们)/;
  const hit = sents.find((s) => marker.test(s) && s.length >= 12);
  if (hit) return hit;
  return sents.slice(0, 2).join('');
}

export function makeSummary(content) {
  const paras = content.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const sents = splitSentences(paras.slice(0, 4).join('\n'));
  let out = '';
  for (const s of sents) {
    if (out && !/[。！？；”」』）]$/.test(out)) out += '。';
    out += s;
    if (out.length >= 110) break;
  }
  return out.slice(0, 200);
}

export function makeStructure(content) {
  const paras = content.split(/\n+/).filter((p) => p.trim().length > 0);
  const feats = [];
  if (/从[^，。]{2,8}(维度|角度|层面|方面)看/.test(content)) feats.push('分层论证（从底线、发展、民生等多个维度展开）');
  if (/一方面[\s\S]{0,120}另一方面/.test(content)) feats.push('辩证分析（一方面……另一方面……）');
  if (/首先[\s\S]{0,200}其次[\s\S]{0,200}(最后|再次)/.test(content)) feats.push('递进/并列式论证（首先—其次—最后）');
  if (/(问题|挑战|短板|困境|难题)[\s\S]{0,300}(对策|举措|要|应当|必须)/.test(content)) feats.push('“问题—对策”结构');
  if (/(不仅|不但)[\s\S]{0,80}(更|而且|还)/.test(content)) feats.push('递进升华（不仅……更……）');
  const head = paras.length <= 8 ? '开门见山' : '由事及理';
  const tail = /(习近平总书记|新征程|高质量|现代化|复兴|人民)/.test(paras.slice(-2).join('')) ? '落脚到时代主题与价值升华' : '收束于启示与行动';
  return `全文${head}提出观点，${feats.length ? feats.join('；') + '，' : '层层展开论证，'}最后${tail}。`;
}

const ANGLE_BANK = {
  law_enforcement: ['从“治理效能”切入，论证制度优势如何转化为基层治理实效', '以“为民服务”为价值主线，构建“问题—原因—对策”的分论点', '把“作风建设”作为破题点，落到干部担当与群众获得感'],
  rural_revitalization: ['以“粮食安全是国之大者”立论，论证底线思维与长远谋划', '从“产业兴旺”切入，写活乡村全面振兴的路径', '用“农民的获得感”作为落脚点，体现以人民为中心'],
  business_environment: ['从“有效市场+有为政府”切入，论证营商环境优化', '以“高水平对外开放”为背景，写统一大市场与制度型开放', '把“经营主体信心”作为观察窗口，落到稳预期政策'],
  sci_tech_innovation: ['以“科技自立自强”为魂，论证创新生态与人才支撑', '从“新质生产力”切入，写教育、科技、人才一体推进', '用“把论文写在祖国大地上”作升华，联系青年担当'],
  green_development: ['以“绿水青山就是金山银山”立论，论证生态优先', '从“双碳目标”切入，写绿色转型与高质量发展协同', '把“生态惠民”作为落脚点，体现民生温度'],
  industrial_upgrading: ['从“实体经济是根基”切入，论证制造业高端化', '以“产业链韧性”为线索，写补短板与锻长板', '用“向新而行”作主题，落到新旧动能转换'],
  digital_economy: ['以“数字中国”为背景，论证数实融合的价值', '从“人工智能治理”切入，写发展与安全并重', '把“数字惠民”作为落点，体现技术向善'],
  cultural_confidence: ['以“文化自信是更基础更广泛更深厚的自信”立论', '从“中华优秀传统文化创造性转化”切入', '用“讲好中国故事”作升华，联系文化出海'],
};

export function makeAngles(topics) {
  const out = [];
  for (const t of topics) {
    for (const a of ANGLE_BANK[t] || []) if (!out.includes(a)) out.push(a);
    if (out.length >= 3) break;
  }
  const generic = [
    '借鉴其结构，用于申论大作文分论点段落的展开',
    '摘取金句作为开头引题或结尾升华',
    '围绕其核心观点提炼“是什么—为什么—怎么办”的论证链',
  ];
  for (const g of generic) {
    if (out.length >= 3) break;
    if (!out.includes(g)) out.push(g);
  }
  return out.slice(0, 4);
}

export function classifyTopics(content, column) {
  const scores = {};
  for (const [key, words] of Object.entries(KEYWORDS)) {
    let s = 0;
    for (const w of words) {
      const c = content.split(w).length - 1;
      if (c > 0) s += Math.min(c, 4);
    }
    scores[key] = s;
  }
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]).filter(([, v]) => v > 0);
  let picked = ranked.slice(0, 2).map(([k]) => k);
  if (picked.length === 0) {
    picked = /党建|党员/.test(column) ? ['law_enforcement'] : ['industrial_upgrading'];
  }
  return picked;
}

export function resolveTopics(title, column, content) {
  for (const [frag, tps] of OVERRIDES) {
    if (title.includes(frag)) return tps;
  }
  return classifyTopics(content, column);
}

// 把一条原始文章（{title,column,date,source,url,content}）整理为素材对象
export function organizeRawArticle(j) {
  const norm = normalizeTitleColumn(j.title, j.column);
  const topics = resolveTopics(norm.title, norm.column, j.content);
  const structure = makeStructure(j.content);
  const core = firstThesis(j.content) || j.content.slice(0, 80);
  const summary = makeSummary(j.content);
  let golden = extractGolden(j.content, 6);
  if (golden.length < 5) {
    const extra = splitSentences(j.content).filter((s) => s.length >= 10 && !golden.includes(s));
    golden = golden.concat(extra).slice(0, 5);
  }
  return {
    title: norm.title,
    column_name: norm.column,
    publish_date: j.date,
    source: j.source || norm.column,
    source_url: j.url,
    core_view: core.slice(0, 160),
    golden_sentences: golden.slice(0, 6),
    argument_structure: structure,
    topics,
    writing_angles: makeAngles(topics),
    summary,
    original_content: (j.content || '').trim(),
    organized_by: 'rule',
  };
}
