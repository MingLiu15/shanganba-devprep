// =====================================================
// ROUTER MODULE - 页面导航逻辑
// =====================================================

import { getQuestionById, getQuestionsByCategory, questions } from './data.js';
import {
  currentCategory, currentFilter, setPage, setCategory, setQuestion, setFilter, setSearchQuery,
  markAttempted, resetProgress, getQuestionStatus, setLang
} from './state.js';
import {
  renderHome, renderCategoryPage, renderQuestionDetail, renderStats,
  renderQuestionList, refreshUI
} from './ui.js';

/**
 * 导航到指定页面
 */
export function navigateTo(page) {
  setPage(page);
  setCategory(null);

  // 更新导航状态
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page && !item.dataset.category);
  });

  // 显示对应页面
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');

  // 刷新内容
  if (page === 'home') renderHome();
  if (page === 'stats') renderStats();

  // 移动端关闭侧边栏
  if (window.innerWidth <= 768) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
  }
}

/**
 * 导航到分类页面
 */
export function navigateToCategory(category) {
  setPage('category');
  setCategory(category);
  setFilter('all');

  // 更新导航状态
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.category === category);
  });

  // 显示分类页面
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pageCategory = document.getElementById('page-category');
  if (pageCategory) pageCategory.classList.add('active');

  // 重置筛选按钮
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.difficulty === 'all');
  });

  renderCategoryPage(category);

  // 移动端关闭侧边栏
  if (window.innerWidth <= 768) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
  }
}

/**
 * 导航到题目详情页
 */
export function navigateToQuestion(questionId) {
  const question = getQuestionById(questionId);
  if (!question) return;

  setQuestion(question);
  setPage('question');

  // 标记为已尝试
  markAttempted(questionId);

  // 显示题目页面
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pageQuestion = document.getElementById('page-question');
  if (pageQuestion) pageQuestion.classList.add('active');

  // 编程题默认语言设为C++
  if (question.starterCode) {
    setLang('cpp');
  }

  renderQuestionDetail(question);

  // 移动端关闭侧边栏
  if (window.innerWidth <= 768) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
  }
}

/**
 * 切换侧边栏
 */
export function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const main = document.getElementById('mainContent');

  if (!sidebar) return;

  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('open');
  } else {
    sidebar.classList.toggle('collapsed');
    if (main) main.classList.toggle('expanded');
  }
}

/**
 * 处理搜索
 */
export function handleSearch(query) {
  const trimmedQuery = query.trim().toLowerCase();
  setSearchQuery(trimmedQuery);

  if (!trimmedQuery) {
    const activePage = document.querySelector('.page.active');
    if (activePage && activePage.id === 'page-search') {
      navigateTo('home');
    }
    return;
  }

  // 显示搜索页面
  setPage('search');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pageSearch = document.getElementById('page-search');
  if (pageSearch) pageSearch.classList.add('active');

  // 执行搜索
  const results = [];

  for (const q of questions) {
    const desc = (q.description || q.content || '').toLowerCase();
    const cat = (q.category || (q.categories && q.categories[0]) || '').toLowerCase();
    if (
      q.title.toLowerCase().includes(trimmedQuery) ||
      q.tags.some(t => t.toLowerCase().includes(trimmedQuery)) ||
      cat.includes(trimmedQuery) ||
      desc.includes(trimmedQuery)
    ) {
      results.push(q);
    }
  }

  const searchInfo = document.getElementById('searchInfo');
  if (searchInfo) {
    searchInfo.textContent = `搜索 "${trimmedQuery}" 找到 ${results.length} 个结果`;
  }

  renderQuestionList(results);
}

/**
 * 筛选题目
 */
export function filterQuestions(difficulty) {
  setFilter(difficulty);

  // 更新难度筛选按钮状态
  document.querySelectorAll('#filterBar .filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.difficulty === difficulty);
  });

  applyFilters();
}

/**
 * 按频率筛选
 */
let currentFrequencyFilter = 'all';

export function filterByFrequency(frequency) {
  currentFrequencyFilter = frequency;

  // 更新频率筛选按钮状态
  document.querySelectorAll('#frequencyFilterBar .filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.frequency === frequency);
  });

  applyFilters();
}

/**
 * 应用所有筛选条件
 */
function applyFilters() {
  if (!currentCategory) return;

  let filtered = getQuestionsByCategory(currentCategory);

  // 应用难度筛选
  const difficultyFilter = currentFilter;
  switch (difficultyFilter) {
    case 'easy':
    case 'medium':
    case 'hard':
      filtered = filtered.filter(q => q.difficulty === difficultyFilter);
      break;
    case 'solved':
      filtered = filtered.filter(q => getQuestionStatus(q.id) === 'solved');
      break;
    case 'unsolved':
      filtered = filtered.filter(q => getQuestionStatus(q.id) !== 'solved');
      break;
  }

  // 应用频率筛选
  if (currentFrequencyFilter !== 'all') {
    filtered = filtered.filter(q => q.frequency === currentFrequencyFilter);
  }

  renderQuestionList(filtered);
}

/**
 * 处理重置进度
 */
export function handleResetProgress() {
  if (resetProgress()) {
    refreshUI();
  }
}

/**
 * 关闭题解弹窗（供全局调用）
 */
export function closeSolutionModal() {
  const overlay = document.getElementById('solutionOverlay');
  if (overlay) overlay.classList.remove('show');
}

/**
 * 初始化路由事件
 */
export function initRouter() {
  // 浏览器后退/前进按钮（基础支持）
  window.addEventListener('popstate', () => {
    // 简单的导航恢复
  });

  // ESC键关闭弹窗
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSolutionModal();
    }
  });
}
