/**
 * SEO 静态页面生成脚本
 * 为每个题目生成独立的 SEO 友好 HTML 页面，并生成 sitemap.xml
 * 
 * 运行方式: node scripts/generate-seo-pages.js
 */

const fs = require('fs');
const path = require('path');

const BRAND_NAME = '上岸吧DevPrep';
const SITE_URL = 'https://yourusername.github.io/shanganba';
const DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_DIR = path.join(__dirname, '..', 'questions');
const SITEMAP_PATH = path.join(__dirname, '..', 'sitemap.xml');

// 分类定义（与 data.js 保持一致）
const CATEGORIES = {
  cpp: { name: 'C/C++' },
  os: { name: '操作系统' },
  python: { name: 'Python' },
  algorithm: { name: '算法题' },
  testing: { name: '自动化测试' },
  shell: { name: 'Shell脚本' }
};

const DIFFICULTY_MAP = { easy: '简单', medium: '中等', hard: '困难' };

// 读取所有题目
function loadAllQuestions() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  const allQuestions = [];
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));
    if (data.questions) allQuestions.push(...data.questions);
  }
  return allQuestions;
}

// 转义 HTML
function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// 将答案文本转为 HTML
function answerToHtml(answer) {
  if (!answer) return '';
  return answer.split('\n').map(line => {
    const escaped = escapeHtml(line);
    if (/^\d+[\.\、]/.test(line)) {
      return `<div class="answer-line"><strong>${escaped}</strong></div>`;
    }
    if (line.trim() === '') return '<br>';
    return `<div class="answer-line">${escaped}</div>`;
  }).join('');
}

// 生成单个题目的静态 HTML
function generateQuestionHtml(question) {
  const catName = CATEGORIES[question.category]?.name || question.category;
  const diffName = DIFFICULTY_MAP[question.difficulty] || question.difficulty;
  const desc = question.content || question.description || '';
  const answer = question.answer || '';
  const tags = (question.tags || []).join(', ');
  const code = question.code;
  const codeText = code ? (code.cpp || code.python || code.javascript || code.java || code.c || '') : '';
  
  // 生成页面 URL
  const pageUrl = `${SITE_URL}/questions/${question.id}.html`;
  
  // 生成描述（截取答案前 160 字符）
  const metaDesc = answer.replace(/\n/g, ' ').substring(0, 160) + (answer.length > 160 ? '...' : '');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(question.title)} - ${catName}面试题 | ${BRAND_NAME}</title>
<meta name="description" content="${escapeHtml(metaDesc)}">
<meta name="keywords" content="${escapeHtml(question.title)},${catName}面试题,${escapeHtml(tags)},编程面试,八股文,上岸">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${pageUrl}">
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(question.title)} - ${catName}面试题">
<meta property="og:description" content="${escapeHtml(metaDesc)}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:site_name" content="${BRAND_NAME}">
<link rel="stylesheet" href="../css/style.css">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "${escapeHtml(question.title)}",
    "text": "${escapeHtml(desc)}",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "${escapeHtml(answer.replace(/\n/g, ' '))}"
    }
  }]
}
</script>
<style>
  .seo-page { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
  .seo-page h1 { font-size: 24px; margin-bottom: 16px; color: #e2e8f0; }
  .seo-meta { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
  .seo-meta span { padding: 4px 12px; border-radius: 20px; font-size: 13px; }
  .seo-difficulty-easy { background: rgba(0,255,136,.1); color: #00ff88; }
  .seo-difficulty-medium { background: rgba(255,184,0,.1); color: #ffb800; }
  .seo-difficulty-hard { background: rgba(255,71,87,.1); color: #ff4757; }
  .seo-category { background: rgba(0,212,255,.1); color: #00d4ff; }
  .seo-tags { margin-bottom: 24px; color: #94a3b8; font-size: 14px; }
  .seo-section { margin-bottom: 32px; }
  .seo-section h2 { font-size: 18px; color: #00d4ff; margin-bottom: 12px; }
  .seo-content { background: #1a1f2e; border: 1px solid #1e293b; border-radius: 10px; padding: 20px; line-height: 2; color: #e2e8f0; font-size: 14px; }
  .seo-answer { background: #1a1f2e; border: 1px solid #1e293b; border-left: 3px solid #00d4ff; border-radius: 10px; padding: 20px; line-height: 2; color: #e2e8f0; font-size: 14px; }
  .seo-answer .answer-line { padding: 2px 0; }
  .seo-code { background: #0a0e17; border: 1px solid #1e293b; border-radius: 10px; padding: 16px 20px; overflow-x: auto; font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.7; color: #e6edf3; white-space: pre-wrap; }
  .seo-back { display: inline-block; margin-top: 24px; padding: 10px 24px; background: #1a1f2e; color: #94a3b8; border: 1px solid #1e293b; border-radius: 10px; text-decoration: none; font-size: 14px; transition: all .25s; }
  .seo-back:hover { background: #111827; color: #e2e8f0; }
  .seo-home-link { display: inline-block; margin-bottom: 24px; color: #00d4ff; text-decoration: none; font-size: 14px; }
  .seo-home-link:hover { text-decoration: underline; }
</style>
</head>
<body style="background:#0a0e17; min-height:100vh;">
<div class="seo-page">
  <a href="../index.html" class="seo-home-link">&larr; 返回 ${BRAND_NAME} 首页</a>
  <h1>${escapeHtml(question.title)}</h1>
  <div class="seo-meta">
    <span class="seo-category">${escapeHtml(catName)}</span>
    <span class="seo-difficulty-${question.difficulty}">${diffName}</span>
  </div>
  ${tags ? `<div class="seo-tags">标签：${escapeHtml(tags)}</div>` : ''}
  
  <div class="seo-section">
    <h2>&#128209; 题目</h2>
    <div class="seo-content"><p>${escapeHtml(desc).replace(/\n/g, '<br>')}</p></div>
  </div>
  
  <div class="seo-section">
    <h2>&#128161; 参考答案</h2>
    <div class="seo-answer">${answerToHtml(answer)}</div>
  </div>
  ${codeText ? `
  <div class="seo-section">
    <h2>&#128187; 代码示例</h2>
    <div class="seo-code">${escapeHtml(codeText)}</div>
  </div>` : ''}
  
  <a href="../index.html" class="seo-back">&larr; 返回题库</a>
</div>
</body>
</html>`;
}

// 生成分类索引页
function generateCategoryIndex(category, categoryName, categoryQuestions) {
  const pageUrl = `${SITE_URL}/questions/${category}.html`;
  
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${categoryName}面试题列表 | ${BRAND_NAME}</title>
<meta name="description" content="${BRAND_NAME} ${categoryName}面试题列表，共 ${categoryQuestions.length} 道题目，涵盖${categoryQuestions.slice(0, 5).map(q => q.title).join('、')}等核心知识点。助你顺利上岸！">
<meta name="keywords" content="${categoryName}面试题,${categoryName}八股文,${categoryQuestions.slice(0, 8).map(q => q.title).join(',')},编程面试,上岸">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${pageUrl}">
<link rel="stylesheet" href="../css/style.css">
<style>
  .seo-page { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
  .seo-page h1 { font-size: 24px; margin-bottom: 8px; color: #e2e8f0; }
  .seo-count { color: #94a3b8; margin-bottom: 24px; font-size: 14px; }
  .seo-list { list-style: none; }
  .seo-list li { margin-bottom: 12px; }
  .seo-list a { color: #00d4ff; text-decoration: none; font-size: 16px; transition: color .25s; }
  .seo-list a:hover { color: #fff; text-decoration: underline; }
  .seo-list .diff { font-size: 12px; margin-left: 8px; }
  .seo-difficulty-easy { color: #00ff88; }
  .seo-difficulty-medium { color: #ffb800; }
  .seo-difficulty-hard { color: #ff4757; }
  .seo-home-link { display: inline-block; margin-bottom: 24px; color: #00d4ff; text-decoration: none; font-size: 14px; }
  .seo-home-link:hover { text-decoration: underline; }
</style>
</head>
<body style="background:#0a0e17; min-height:100vh;">
<div class="seo-page">
  <a href="../index.html" class="seo-home-link">&larr; 返回 ${BRAND_NAME} 首页</a>
  <h1>${categoryName}面试题</h1>
  <div class="seo-count">共 ${categoryQuestions.length} 道题目</div>
  <ul class="seo-list">
    ${categoryQuestions.map(q => `<li><a href="${q.id}.html">${escapeHtml(q.title)}</a><span class="diff seo-difficulty-${q.difficulty}">[${DIFFICULTY_MAP[q.difficulty] || q.difficulty}]</span></li>`).join('\n    ')}
  </ul>
</div>
</body>
</html>`;
}

// 生成 sitemap.xml
function generateSitemap(urls) {
  const today = new Date().toISOString().split('T')[0];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq || 'weekly'}</changefreq>
    <priority>${u.priority || '0.5'}</priority>
  </url>`).join('\n')}
</urlset>`;
}

// 主函数
function main() {
  console.log('🔍 加载题目数据...');
  const allQuestions = loadAllQuestions();
  console.log(`📊 共加载 ${allQuestions.length} 道题目`);

  // 创建输出目录
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const sitemapUrls = [];

  // 首页
  sitemapUrls.push({ url: SITE_URL + '/', changefreq: 'daily', priority: '1.0' });

  // 按分类分组
  const grouped = {};
  for (const q of allQuestions) {
    const cat = q.category || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(q);
  }

  // 生成分类索引页
  for (const [cat, catQuestions] of Object.entries(grouped)) {
    const catName = CATEGORIES[cat]?.name || cat;
    const html = generateCategoryIndex(cat, catName, catQuestions);
    const filePath = path.join(OUTPUT_DIR, `${cat}.html`);
    fs.writeFileSync(filePath, html, 'utf-8');
    sitemapUrls.push({ url: `${SITE_URL}/questions/${cat}.html`, changefreq: 'weekly', priority: '0.8' });
    console.log(`  📄 ${cat}.html (${catQuestions.length} 题)`);
  }

  // 生成每个题目的静态页面
  for (const q of allQuestions) {
    const html = generateQuestionHtml(q);
    const filePath = path.join(OUTPUT_DIR, `${q.id}.html`);
    fs.writeFileSync(filePath, html, 'utf-8');
    sitemapUrls.push({ url: `${SITE_URL}/questions/${q.id}.html`, changefreq: 'monthly', priority: '0.6' });
  }
  console.log(`  📄 已生成 ${allQuestions.length} 个题目页面`);

  // 生成 sitemap.xml
  const sitemap = generateSitemap(sitemapUrls);
  fs.writeFileSync(SITEMAP_PATH, sitemap, 'utf-8');
  console.log(`  🗺️  sitemap.xml (${sitemapUrls.length} 个 URL)`);

  console.log('\n✅ SEO 静态页面生成完成！');
  console.log(`   输出目录: ${OUTPUT_DIR}`);
  console.log(`   Sitemap: ${SITEMAP_PATH}`);
  console.log('\n⚠️  请记得将 sitemap.xml 和 robots.txt 中的 URL 替换为你的实际 GitHub Pages 地址');
}

main();
