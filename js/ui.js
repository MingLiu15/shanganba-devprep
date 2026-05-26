// =====================================================
// UI MODULE - 界面渲染函数
// =====================================================

import { CATEGORIES, getQuestions, getQuestionsByCategory, searchQuestions } from './data.js';
import { currentPage, currentCategory, currentQuestion, currentLang, currentFilter,
  getQuestionStatus, getStats, getCategoryStats, updateStreak, getProgress, saveProgress,
  setPage, setCategory, setQuestion, setLang, setFilter, setSearchQuery, markSolved,
  getCurrentUser, isLoggedIn, addHistoryRecord
} from './state.js';
import { initEditor, switchLang, resetCode, runCode, showSolution, closeSolution } from './editor.js';

// 难度中文映射
const DIFFICULTY_MAP = {
  easy: '简单',
  medium: '中等',
  hard: '困难'
};

// 频率中文映射
const FREQUENCY_MAP = {
  high: '高频',
  medium: '中频',
  low: '低频'
};

// 重要程度中文映射
const IMPORTANCE_MAP = {
  high: '重要',
  medium: '一般',
  low: '了解'
};

// 频率标签样式
const FREQUENCY_CLASS = {
  high: 'freq-high',
  medium: 'freq-medium',
  low: 'freq-low'
};

// 重要程度标签样式
const IMPORTANCE_CLASS = {
  high: 'imp-high',
  medium: 'imp-medium',
  low: 'imp-low'
};

/**
 * 转义HTML特殊字符
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 数字动画
 */
const animatingElements = new Set();

export function animateNumber(elementId, target) {
  const el = document.getElementById(elementId);
  if (!el) return;
  
  // 防止同一元素重复动画
  if (animatingElements.has(elementId)) return;
  animatingElements.add(elementId);
  
  const start = parseInt(el.textContent) || 0;
  const duration = 600;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      animatingElements.delete(elementId);
    }
  }
  requestAnimationFrame(update);
}

/**
 * 渲染首页
 */
export function renderHome() {
  const stats = getStats();

  animateNumber('totalQuestions', stats.total);
  animateNumber('solvedCount', stats.solved);
  animateNumber('attemptedCount', stats.attempted);
  document.getElementById('completionRate').textContent = stats.rate + '%';

  // 渲染分类卡片
  const grid = document.getElementById('categoryGrid');
  if (!grid) return;

  grid.innerHTML = '';

  Object.entries(CATEGORIES).forEach(([key, cat]) => {
    const catStats = getCategoryStats(key);

    const card = document.createElement('div');
    card.className = 'category-card';
    card.style.setProperty('--card-accent', cat.color);
    card.onclick = () => navigateToCategory(key);
    card.innerHTML = `
      <div class="card-icon">${cat.icon}</div>
      <div class="card-title">${cat.name}</div>
      <div class="card-desc">${cat.desc}</div>
      <div class="card-footer">
        <span>${catStats.solved} / ${catStats.total} 已解决</span>
        <span>${catStats.rate}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${catStats.rate}%;background:${cat.color}"></div>
      </div>
    `;
    grid.appendChild(card);
  });

  // 更新侧边栏徽章
  Object.keys(CATEGORIES).forEach(key => {
    const badge = document.getElementById('badge-' + key);
    if (badge) {
      const catStats = getCategoryStats(key);
      badge.textContent = catStats.solved + '/' + catStats.total;
    }
  });

  // 终端动画
  runTerminalAnimation();
}

/**
 * 渲染分类页面
 */
export function renderCategoryPage(category) {
  const cat = CATEGORIES[category];
  if (!cat) return;

  const titleEl = document.getElementById('categoryTitle');
  const countEl = document.getElementById('categoryCount');

  if (titleEl) titleEl.textContent = cat.name;

  const catQuestions = getQuestionsByCategory(category);
  if (countEl) countEl.textContent = catQuestions.length + ' 题';

  renderQuestionList(catQuestions);
}

/**
 * 渲染题目列表
 */
export function renderQuestionList(questionList) {
  const container = document.getElementById('questionList');
  if (!container) return;

  container.innerHTML = '';

  if (questionList.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#128533;</div>
        <p>暂无匹配的题目</p>
      </div>
    `;
    return;
  }

  questionList.forEach((q, index) => {
    const status = getQuestionStatus(q.id);
    const item = document.createElement('div');
    item.className = 'question-item';
    item.onclick = () => navigateToQuestion(q.id);

    const statusIcon = status === 'solved' ? '&#10003;' : (status === 'attempted' ? '&#9675;' : '');
    const statusClass = status === 'solved' ? 'solved' : (status === 'attempted' ? 'attempted' : '');

    // 频率和重要程度标签
    const freqHtml = q.frequency ? `<span class="freq-tag ${FREQUENCY_CLASS[q.frequency]}">${FREQUENCY_MAP[q.frequency]}</span>` : '';
    const impHtml = q.importance ? `<span class="imp-tag ${IMPORTANCE_CLASS[q.importance]}">${IMPORTANCE_MAP[q.importance]}</span>` : '';

    item.innerHTML = `
      <div class="q-status ${statusClass}">${statusIcon}</div>
      <div class="q-info">
        <div class="q-title">${index + 1}. ${q.title}</div>
        <div class="q-meta">
          <span class="difficulty ${q.difficulty}">${DIFFICULTY_MAP[q.difficulty]}</span>
          ${freqHtml}
          ${impHtml}
        </div>
        <div class="q-tags">
          ${q.tags.map(t => `<span class="tag">${t}</span>`).join('')}
        </div>
      </div>
    `;
    container.appendChild(item);
  });
}

/**
 * 渲染题目详情（面试知识点模式）
 */
export function renderQuestionDetail(question) {
  // 切换题目时停止朗读
  stopTTS();

  // 编程题模式：有starterCode字段则为编程题
  if (question.starterCode) {
    renderCodingQuestion(question);
    return;
  }

  const titleEl = document.getElementById('questionTitle');
  const diffEl = document.getElementById('questionDifficulty');
  const tagsEl = document.getElementById('questionTags');
  const contentEl = document.getElementById('questionContent');
  const answerContentEl = document.getElementById('answerContent');
  const codeSectionEl = document.getElementById('codeSection');
  const codeBlockEl = document.getElementById('codeBlock');
  const answerHintEl = document.getElementById('answerHint');

  if (titleEl) titleEl.textContent = question.title;

  if (diffEl) {
    diffEl.textContent = DIFFICULTY_MAP[question.difficulty];
    diffEl.className = 'difficulty ' + question.difficulty;
  }

  // 添加频率和重要程度标签到题目头部
  const metaEl = document.getElementById('questionMeta');
  if (metaEl) {
    const freqHtml = question.frequency ? `<span class="freq-tag ${FREQUENCY_CLASS[question.frequency]}">${FREQUENCY_MAP[question.frequency]}</span>` : '';
    const impHtml = question.importance ? `<span class="imp-tag ${IMPORTANCE_CLASS[question.importance]}">${IMPORTANCE_MAP[question.importance]}</span>` : '';
    metaEl.innerHTML = `
      <span class="difficulty ${question.difficulty}">${DIFFICULTY_MAP[question.difficulty]}</span>
      ${freqHtml}
      ${impHtml}
    `;
  }

  if (tagsEl) {
    tagsEl.innerHTML = question.tags.map(t => `<span class="tag">${t}</span>`).join('');
  }

  // 渲染题目内容
  if (contentEl) {
    const desc = question.content || question.description || '';
    contentEl.innerHTML = `<p>${escapeHtml(desc).replace(/\n/g, '<br>')}</p>`;
  }

  // 渲染答案（默认隐藏）
  if (answerContentEl) {
    const answer = question.answer || '';
    answerContentEl.innerHTML = answer.split('\n').map(line => {
      const escaped = escapeHtml(line);
      // 数字开头的行作为列表项
      if (/^\d+[\.\、]/.test(line)) {
        return `<div class="answer-line">${escaped}</div>`;
      }
      if (line.trim() === '') return '<br>';
      return `<div class="answer-line">${escaped}</div>`;
    }).join('');
    answerContentEl.style.display = 'none';
  }

  if (answerHintEl) answerHintEl.textContent = '（点击展开）';

  // 渲染代码示例（如果有）
  if (codeSectionEl) {
    const code = question.code;
    if (code) {
      // 优先显示cpp，其次javascript
      const codeText = code.cpp || code.python || code.javascript || code.java || code.c || '';
      if (codeText) {
        codeSectionEl.style.display = 'block';
        if (codeBlockEl) codeBlockEl.textContent = codeText;
      } else {
        codeSectionEl.style.display = 'none';
      }
    } else {
      codeSectionEl.style.display = 'none';
    }
  }

  // 更新"已掌握"按钮状态
  const btnSolved = document.getElementById('btnSolved');
  if (btnSolved) {
    const status = getQuestionStatus(question.id);
    if (status === 'solved') {
      btnSolved.textContent = '✓ 已掌握';
      btnSolved.classList.add('is-solved');
    } else {
      btnSolved.textContent = '✓ 标记已掌握';
      btnSolved.classList.remove('is-solved');
    }
  }
  
  // 记录做题历史
  recordQuestionView(question.id);
}

/**
 * 切换答案显示/隐藏
 */
window.toggleAnswer = function() {
  const content = document.getElementById('answerContent');
  const hint = document.getElementById('answerHint');
  const ttsBtn = document.getElementById('ttsBtn');
  if (!content) return;
  const visible = content.style.display !== 'none';
  content.style.display = visible ? 'none' : 'block';
  if (hint) hint.textContent = visible ? '（点击展开）' : '（点击收起）';
  // 答案展开时显示朗读按钮，收起时隐藏并停止朗读
  if (ttsBtn) {
    ttsBtn.style.display = visible ? 'none' : 'inline-flex';
    if (visible) stopTTS();
  }
};

// =====================================================
// TTS 朗读答案功能（Web Speech API）
// =====================================================

let ttsUtterance = null;
let ttsSpeaking = false;

/**
 * 获取答案纯文本（去除HTML标签）
 */
function getAnswerPlainText() {
  const el = document.getElementById('answerContent');
  if (!el) return '';
  return el.textContent || el.innerText || '';
}

/**
 * 将文本按句子分割，优化停顿效果
 * 在中文标点、英文标点、数字序号处分割
 * 返回包含停顿时长的句子数组
 */
function splitTextIntoSentences(text) {
  // 清理文本：去除多余空白
  text = text.replace(/[ \t]+/g, ' ').trim();
  
  // 预处理：在数字序号前插入换行符（解决 DOM textContent 拼接丢失换行的问题）
  // 匹配模式：非数字字符后紧跟 "数字." 或 "数字、"（如 "定义2." 或 "定义2、"）
  text = text.replace(/([^\d\n])(\d+[\.、])/g, '$1\n$2');
  
  const sentences = [];
  let currentSentence = '';
  
  // 标点停顿时长配置（毫秒）
  const pauseMap = {
    '。': 600,  // 句号 - 长停顿
    '！': 600,  // 感叹号 - 长停顿
    '？': 600,  // 问号 - 长停顿
    '；': 500,  // 分号 - 中等停顿
    '，': 350,  // 逗号 - 短停顿
    '.': 600,   // 英文句号
    '!': 600,   // 英文感叹号
    '?': 600,   // 英文问号
    ';': 500,   // 英文分号
    ',': 350,   // 英文逗号
    '\n': 500   // 换行 - 中等停顿
  };
  
  // 冒号单独处理：只在"序号. 标题：内容"这种模式下分割
  const colonPause = 400;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    currentSentence += char;
    
    const nextChar = text[i + 1];
    const prevChar = text[i - 1];
    
    if (char === '：' || char === ':') {
      // 冒号分割条件：前面是中文/字母/数字（标题结尾），后面是中文/字母（内容开始）
      // 例如 "1. 定义方式：指针使用..." 或 "优点：简单公平"
      const isAfterWord = prevChar && /[\u4e00-\u9fff\w]/.test(prevChar);
      const isBeforeContent = nextChar && /[\u4e00-\u9fff\w]/.test(nextChar);
      if (isAfterWord && isBeforeContent) {
        if (currentSentence.trim()) {
          sentences.push({
            text: currentSentence.trim(),
            pause: colonPause
          });
        }
        currentSentence = '';
        continue;
      }
    }
    
    // 检查是否是其他句子结束符
    if (pauseMap[char] !== undefined) {
      // 向前查看，如果下一个是空格、换行、结束或数字，则确认分割
      if (!nextChar || nextChar === ' ' || nextChar === '\n' || /\d/.test(nextChar)) {
        if (currentSentence.trim()) {
          sentences.push({
            text: currentSentence.trim(),
            pause: pauseMap[char]
          });
        }
        currentSentence = '';
      }
    }
  }
  
  // 添加最后剩余的文本（默认短停顿）
  if (currentSentence.trim()) {
    sentences.push({
      text: currentSentence.trim(),
      pause: 300
    });
  }
  
  return sentences.filter(s => s.text.length > 0);
}

/**
 * 开始朗读答案（分句朗读，优化停顿）
 */
function startTTS() {
  const text = getAnswerPlainText();
  if (!text.trim()) return;

  // 停止之前的朗读
  window.speechSynthesis.cancel();

  const sentences = splitTextIntoSentences(text);
  if (sentences.length === 0) return;

  let currentIndex = 0;
  ttsSpeaking = true;
  updateTTSUI(true);

  // 递归朗读每个句子
  function speakNext() {
    if (!ttsSpeaking || currentIndex >= sentences.length) {
      ttsSpeaking = false;
      updateTTSUI(false);
      return;
    }

    const { text: sentence, pause } = sentences[currentIndex];
    currentIndex++;

    ttsUtterance = new SpeechSynthesisUtterance(sentence);
    ttsUtterance.lang = 'zh-CN';
    ttsUtterance.rate = 1.0;
    ttsUtterance.pitch = 1.0;

    // 尝试选择中文语音
    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find(v => v.lang.startsWith('zh'));
    if (zhVoice) ttsUtterance.voice = zhVoice;

    ttsUtterance.onend = () => {
      // 根据标点类型添加不同的停顿时长
      if (ttsSpeaking && currentIndex < sentences.length) {
        setTimeout(speakNext, pause);
      } else {
        ttsSpeaking = false;
        updateTTSUI(false);
      }
    };

    ttsUtterance.onerror = () => {
      ttsSpeaking = false;
      updateTTSUI(false);
    };

    window.speechSynthesis.speak(ttsUtterance);
  }

  speakNext();
}

/**
 * 停止朗读
 */
function stopTTS() {
  window.speechSynthesis.cancel();
  ttsSpeaking = false;
  updateTTSUI(false);
}

/**
 * 更新朗读按钮UI状态
 */
function updateTTSUI(speaking) {
  const icon = document.getElementById('ttsIcon');
  const label = document.getElementById('ttsLabel');
  const btn = document.getElementById('ttsBtn');
  if (!btn) return;
  if (speaking) {
    btn.classList.add('tts-playing');
    if (icon) icon.innerHTML = '&#128264;';
    if (label) label.textContent = '停止';
    btn.title = '停止朗读';
  } else {
    btn.classList.remove('tts-playing');
    if (icon) icon.innerHTML = '&#128266;';
    if (label) label.textContent = '朗读';
    btn.title = '朗读答案';
  }
}

/**
 * 切换朗读/停止
 */
window.toggleTTS = function() {
  if (ttsSpeaking) {
    stopTTS();
  } else {
    startTTS();
  }
};

// 确保语音列表加载完成（某些浏览器异步加载）
if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

/**
 * 获取并跳转到下一个题目
 */
function goToNextQuestion() {
  if (!currentQuestion) return;
  
  // 获取当前分类的所有题目
  const categoryQuestions = getQuestionsByCategory(currentQuestion.category);
  if (!categoryQuestions || categoryQuestions.length === 0) return;
  
  // 找到当前题目在列表中的位置
  const currentIndex = categoryQuestions.findIndex(q => q.id === currentQuestion.id);
  
  // 如果有下一个题目，跳转
  if (currentIndex >= 0 && currentIndex < categoryQuestions.length - 1) {
    const nextQuestion = categoryQuestions[currentIndex + 1];
    // 延迟跳转，让用户看到标记成功的反馈
    setTimeout(() => {
      window.navigateToQuestion(nextQuestion.id);
    }, 300);
    return true;
  }
  
  return false;
}

/**
 * 标记当前题目已掌握
 */
window.markCurrentSolved = function() {
  if (!currentQuestion) return;
  const status = getQuestionStatus(currentQuestion.id);
  
  // 是否是新标记为已掌握（不是取消标记）
  const isNewlySolved = status !== 'solved';
  
  if (status === 'solved') {
    // 取消标记
    const progress = getProgress();
    delete progress[currentQuestion.id];
    saveProgress(progress);
  } else {
    markSolved(currentQuestion.id);
  }
  
  renderQuestionDetail(currentQuestion);
  refreshUI();
  
  // 如果是新标记为已掌握，自动跳转到下一个题目
  if (isNewlySolved) {
    const hasNext = goToNextQuestion();
    // 如果没有下一个题目，可以显示提示
    if (!hasNext) {
      // 可选：显示完成提示
      console.log('已完成当前分类所有题目');
    }
  }
};

/**
 * 返回当前分类列表
 */
window.goBackToList = function() {
  if (currentQuestion && currentQuestion.category) {
    navigateToCategory(currentQuestion.category);
  } else if (currentCategory) {
    navigateToCategory(currentCategory);
  } else {
    navigateTo('home');
  }
};

/**
 * 渲染统计页面
 */
export function renderStats() {
  const stats = getStats();

  const statSolved = document.getElementById('stat-solved');
  const statTotal = document.getElementById('stat-total');
  const statRate = document.getElementById('stat-rate');
  const statStreak = document.getElementById('stat-streak');

  if (statSolved) statSolved.textContent = stats.solved;
  if (statTotal) statTotal.textContent = stats.total;
  if (statRate) statRate.textContent = stats.rate + '%';
  if (statStreak) statStreak.textContent = stats.streak;

  // 分类进度条
  const chartEl = document.getElementById('categoryChart');
  if (chartEl) {
    chartEl.innerHTML = '';
    Object.entries(CATEGORIES).forEach(([key, cat]) => {
      const catStats = getCategoryStats(key);
      chartEl.innerHTML += `
        <div class="bar-item">
          <span class="bar-label">${cat.name}</span>
          <div class="bar-track">
            <div class="bar-fill" style="width:${catStats.rate}%;background:${cat.color}">${catStats.solved}/${catStats.total}</div>
          </div>
        </div>
      `;
    });
  }

  // 难度分布
  const diffChart = document.getElementById('difficultyChart');
  if (diffChart) {
    const allQuestions = getQuestions();
    const easyCount = allQuestions.filter(q => q.difficulty === 'easy').length;
    const mediumCount = allQuestions.filter(q => q.difficulty === 'medium').length;
    const hardCount = allQuestions.filter(q => q.difficulty === 'hard').length;

    diffChart.innerHTML = `
      <div class="difficulty-item">
        <div class="diff-count text-green">${easyCount}</div>
        <div class="diff-label">&#9679; 简单</div>
      </div>
      <div class="difficulty-item">
        <div class="diff-count text-amber">${mediumCount}</div>
        <div class="diff-label">&#9679; 中等</div>
      </div>
      <div class="difficulty-item">
        <div class="diff-count text-red">${hardCount}</div>
        <div class="diff-label">&#9679; 困难</div>
      </div>
    `;
  }
}

/**
 * 终端打字动画
 */
function runTerminalAnimation() {
  const terminalBody = document.getElementById('terminalBody');
  if (!terminalBody) return;

  const allQuestions = getQuestions();
  const lines = [
    { type: 'cmd', text: 'shanganba start' },
    { type: 'output', text: '&#9889; 上岸吧DevPrep 面试题引擎启动中...' },
    { type: 'output', text: '&#128202; 已加载 ' + allQuestions.length + ' 道题目' },
    { type: 'output', text: '&#127919; 涵盖 ' + Object.keys(CATEGORIES).length + ' 个分类' },
    { type: 'cmd', text: 'shanganba status' },
    { type: 'output', text: '&#9989; 系统就绪，开始刷题吧！' }
  ];

  terminalBody.innerHTML = '';

  let lineIndex = 0;
  let charIndex = 0;
  let currentLineEl = null;

  function typeNext() {
    if (lineIndex >= lines.length) {
      const cursorLine = document.createElement('div');
      cursorLine.className = 'terminal-line';
      cursorLine.innerHTML = '<span class="prompt">$ </span><span class="cursor-blink"></span>';
      terminalBody.appendChild(cursorLine);
      return;
    }

    const line = lines[lineIndex];

    if (charIndex === 0) {
      currentLineEl = document.createElement('div');
      currentLineEl.className = 'terminal-line';
      terminalBody.appendChild(currentLineEl);
    }

    if (line.type === 'cmd') {
      if (charIndex === 0) {
        currentLineEl.innerHTML = '<span class="prompt">$ </span><span class="cmd"></span>';
      }
      const cmdSpan = currentLineEl.querySelector('.cmd');
      if (charIndex < line.text.length) {
        cmdSpan.textContent += line.text[charIndex];
        charIndex++;
        setTimeout(typeNext, 40);
      } else {
        charIndex = 0;
        lineIndex++;
        setTimeout(typeNext, 300);
      }
    } else {
      currentLineEl.innerHTML = `<span class="output">${line.text}</span>`;
      charIndex = 0;
      lineIndex++;
      setTimeout(typeNext, 200);
    }
  }

  setTimeout(typeNext, 500);
}

/**
 * 刷新UI
 */
export function refreshUI() {
  if (currentPage === 'home') renderHome();
  if (currentPage === 'category' && currentCategory) renderCategoryPage(currentCategory);
  if (currentPage === 'stats') renderStats();
  updateStreak();
}

const CODING_LANG_NAMES = {
  javascript: 'JavaScript',
  python: 'Python',
  java: 'Java',
  cpp: 'C++',
  go: 'Go'
};

function renderCodingQuestion(question) {
  // 切换到编程题页面
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const codingPage = document.getElementById('page-coding');
  if (codingPage) codingPage.classList.add('active');

  const el = (id) => document.getElementById(id);
  if (el('codingTitle')) el('codingTitle').textContent = question.title;
  if (el('codingDifficulty')) {
    el('codingDifficulty').textContent = DIFFICULTY_MAP[question.difficulty];
    el('codingDifficulty').className = 'difficulty ' + question.difficulty;
  }
  if (el('codingTags')) {
    el('codingTags').innerHTML = question.tags.map(t => `<span class="tag">${t}</span>`).join('');
  }
  if (el('codingDescription')) {
    const desc = question.description || '';
    el('codingDescription').innerHTML = desc.split('\n').map(line => {
      if (line.trim() === '') return '<br>';
      return `<p>${escapeHtml(line)}</p>`;
    }).join('');
  }
  if (el('codingTestCases') && question.testCases) {
    el('codingTestCases').innerHTML = question.testCases.map((tc, i) => `
      <div class="test-case">
        <div class="test-case-header">用例 ${i + 1}</div>
        <div class="test-case-body">
          <div><strong>输入：</strong><code>${escapeHtml(tc.input)}</code></div>
          <div><strong>输出：</strong><code>${escapeHtml(tc.expectedOutput)}</code></div>
        </div>
      </div>
    `).join('');
  }
  if (el('langTabs')) {
    const langs = question.starterCode ? Object.keys(question.starterCode) : ['javascript'];
    el('langTabs').innerHTML = langs.map(lang =>
      `<button class="lang-tab ${lang === 'cpp' ? 'active' : ''}" data-lang="${lang}" onclick="switchLang('${lang}')">${CODING_LANG_NAMES[lang] || lang}</button>`
    ).join('');
  }

  // 更新"已掌握"按钮状态
  const btnSolved = document.getElementById('btnCodingSolved');
  if (btnSolved) {
    const status = getQuestionStatus(question.id);
    if (status === 'solved') {
      btnSolved.textContent = '✓ 已掌握';
      btnSolved.classList.add('is-solved');
    } else {
      btnSolved.textContent = '✓ 标记已掌握';
      btnSolved.classList.remove('is-solved');
    }
  }

  // 初始化编辑器（通过全局函数）
  if (window.initCodingEditor) window.initCodingEditor(question);
}

window.goBackCodingToList = function() {
  if (currentQuestion && currentQuestion.category) {
    navigateToCategory(currentQuestion.category);
  } else if (currentCategory) {
    navigateToCategory(currentCategory);
  } else {
    navigateTo('home');
  }
};

window.markCodingSolved = function() {
  if (!currentQuestion) return;
  const status = getQuestionStatus(currentQuestion.id);
  
  // 是否是新标记为已掌握（不是取消标记）
  const isNewlySolved = status !== 'solved';
  
  if (status === 'solved') {
    const progress = getProgress();
    delete progress[currentQuestion.id];
    saveProgress(progress);
  } else {
    markSolved(currentQuestion.id);
  }
  
  renderCodingQuestion(currentQuestion);
  refreshUI();
  
  // 如果是新标记为已掌握，自动跳转到下一个题目
  if (isNewlySolved) {
    const hasNext = goToNextQuestion();
    if (!hasNext) {
      console.log('已完成当前分类所有题目');
    }
  }
};

// 导出编辑器相关函数供全局使用
export { switchLang, resetCode, runCode, showSolution, closeSolution };

// =====================================================
// 用户UI更新
// =====================================================

export function updateUserUI() {
  const loginBtn = document.getElementById('loginBtn');
  const userMenu = document.getElementById('userMenu');
  const usernameDisplay = document.getElementById('usernameDisplay');
  
  const user = getCurrentUser();
  
  if (user) {
    // 已登录状态
    if (loginBtn) loginBtn.style.display = 'none';
    if (userMenu) {
      userMenu.style.display = 'flex';
      if (usernameDisplay) {
        usernameDisplay.textContent = user.username;
      }
    }
  } else {
    // 未登录状态
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (userMenu) {
      userMenu.style.display = 'none';
    }
  }
}

// =====================================================
// 做题记录功能
// =====================================================

export function recordQuestionView(questionId) {
  if (isLoggedIn()) {
    addHistoryRecord(questionId, 'view');
  }
}

export function recordQuestionAttempt(questionId, details = {}) {
  if (isLoggedIn()) {
    addHistoryRecord(questionId, 'attempt', details);
  }
}

export function recordQuestionSolve(questionId, details = {}) {
  if (isLoggedIn()) {
    addHistoryRecord(questionId, 'solve', details);
  }
}

export function recordCodeRun(questionId, lang, success) {
  if (isLoggedIn()) {
    addHistoryRecord(questionId, 'run_code', { lang, success });
  }
}
