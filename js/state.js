// =====================================================
// STATE MODULE - 状态管理和进度跟踪
// =====================================================

import { getQuestions } from './data.js';

// 当前状态
export let currentPage = 'home';
export let currentCategory = null;
export let currentQuestion = null;
export let currentLang = 'javascript';
export let currentFilter = 'all';
export let searchQuery = '';
export let currentUser = null;

// 存储键名
const PROGRESS_KEY = 'shanganba_progress';
const USER_KEY = 'shanganba_user';
const USERS_KEY = 'shanganba_users';
const HISTORY_KEY = 'shanganba_history';

/**
 * 获取进度数据
 */
export function getProgress() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
  } catch {
    return {};
  }
}

/**
 * 保存进度数据
 */
export function saveProgress(progress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

/**
 * 标记题目为已解决
 */
export function markSolved(questionId) {
  const progress = getProgress();
  progress[questionId] = { status: 'solved', date: new Date().toISOString() };
  saveProgress(progress);
  updateStreak();
}

/**
 * 标记题目为已尝试
 */
export function markAttempted(questionId) {
  const progress = getProgress();
  if (!progress[questionId] || progress[questionId].status !== 'solved') {
    progress[questionId] = { status: 'attempted', date: new Date().toISOString() };
    saveProgress(progress);
  }
}

/**
 * 获取题目状态
 */
export function getQuestionStatus(questionId) {
  const progress = getProgress();
  return progress[questionId]?.status || 'unsolved';
}

/**
 * 更新连续打卡天数
 */
export function updateStreak() {
  const progress = getProgress();
  const dates = Object.values(progress)
    .map(p => p.date?.split('T')[0])
    .filter(Boolean);
  const uniqueDates = [...new Set(dates)].sort().reverse();

  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (!uniqueDates.length) {
    streak = 0;
  } else if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
    streak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const curr = new Date(uniqueDates[i - 1]);
      const prev = new Date(uniqueDates[i]);
      const diff = (curr - prev) / 86400000;
      if (diff === 1) streak++;
      else break;
    }
  }

  // 更新UI
  const streakEl = document.getElementById('streakCount');
  if (streakEl) {
    streakEl.textContent = streak;
  }
  return streak;
}

/**
 * 重置所有进度
 */
export function resetProgress() {
  if (confirm('确定要重置所有进度吗？此操作不可撤销。')) {
    localStorage.removeItem(PROGRESS_KEY);
    return true;
  }
  return false;
}

/**
 * 获取统计信息
 */
export function getStats() {
  const progress = getProgress();
  const allQuestions = getQuestions();
  const solved = allQuestions.filter(q => getQuestionStatus(q.id) === 'solved').length;
  const attempted = allQuestions.filter(q => getQuestionStatus(q.id) === 'attempted').length;
  const total = allQuestions.length;
  const rate = total > 0 ? Math.round((solved / total) * 100) : 0;

  return {
    total,
    solved,
    attempted,
    rate,
    streak: updateStreak()
  };
}

/**
 * 获取分类统计
 */
export function getCategoryStats(category) {
  const allQuestions = getQuestions();
  const catQuestions = allQuestions.filter(q => {
    if (q.categories && Array.isArray(q.categories)) {
      return q.categories.includes(category);
    }
    return q.category === category;
  });
  const solved = catQuestions.filter(q => getQuestionStatus(q.id) === 'solved').length;
  const total = catQuestions.length;
  const rate = total > 0 ? Math.round((solved / total) * 100) : 0;

  return { total, solved, rate };
}

/**
 * 设置当前页面
 */
export function setPage(page) {
  currentPage = page;
}

/**
 * 设置当前分类
 */
export function setCategory(category) {
  currentCategory = category;
}

/**
 * 设置当前题目
 */
export function setQuestion(question) {
  currentQuestion = question;
}

/**
 * 设置当前语言
 */
export function setLang(lang) {
  currentLang = lang;
}

/**
 * 设置当前筛选
 */
export function setFilter(filter) {
  currentFilter = filter;
}

/**
 * 设置搜索查询
 */
export function setSearchQuery(query) {
  searchQuery = query;
}

// =====================================================
// 用户管理功能
// =====================================================

/**
 * 获取所有用户
 */
export function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * 保存用户列表
 */
export function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/**
 * 注册用户
 */
export function registerUser(username, password) {
  const users = getUsers();
  if (users.find(u => u.username === username)) {
    return { success: false, message: '用户名已存在' };
  }
  users.push({ username, password, createdAt: new Date().toISOString() });
  saveUsers(users);
  return { success: true, message: '注册成功' };
}

/**
 * 登录用户
 */
export function loginUser(username, password) {
  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    return { success: false, message: '用户名或密码错误' };
  }
  currentUser = { username: user.username, loginAt: new Date().toISOString() };
  localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
  return { success: true, message: '登录成功', user: currentUser };
}

/**
 * 获取当前登录用户
 */
export function getCurrentUser() {
  if (currentUser) return currentUser;
  try {
    const saved = localStorage.getItem(USER_KEY);
    if (saved) {
      currentUser = JSON.parse(saved);
      return currentUser;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * 退出登录
 */
export function logoutUser() {
  currentUser = null;
  localStorage.removeItem(USER_KEY);
}

/**
 * 检查是否已登录
 */
export function isLoggedIn() {
  return getCurrentUser() !== null;
}

// =====================================================
// 做题记录功能
// =====================================================

/**
 * 获取做题历史
 */
export function getHistory() {
  const user = getCurrentUser();
  if (!user) return [];
  try {
    const allHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
    return allHistory[user.username] || [];
  } catch {
    return [];
  }
}

/**
 * 保存做题历史
 */
export function saveHistory(history) {
  const user = getCurrentUser();
  if (!user) return;
  const allHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
  allHistory[user.username] = history;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(allHistory));
}

/**
 * 添加做题记录
 */
export function addHistoryRecord(questionId, action, details = {}) {
  const user = getCurrentUser();
  if (!user) return;
  
  const history = getHistory();
  history.push({
    questionId,
    action, // 'view', 'attempt', 'solve', 'run_code'
    details,
    timestamp: new Date().toISOString()
  });
  saveHistory(history);
}

/**
 * 获取用户的做题统计
 */
export function getUserStats() {
  const user = getCurrentUser();
  if (!user) return null;
  
  const history = getHistory();
  const progress = getProgress();
  
  // 按日期统计
  const dailyStats = {};
  history.forEach(record => {
    const date = record.timestamp.split('T')[0];
    if (!dailyStats[date]) {
      dailyStats[date] = { viewed: 0, attempted: 0, solved: 0 };
    }
    if (record.action === 'view') dailyStats[date].viewed++;
    if (record.action === 'attempt') dailyStats[date].attempted++;
    if (record.action === 'solve') dailyStats[date].solved++;
  });
  
  // 最近做题
  const recentQuestions = history
    .filter(h => h.action === 'view')
    .slice(-10)
    .reverse();
  
  return {
    username: user.username,
    totalSolved: Object.values(progress).filter(p => p.status === 'solved').length,
    totalAttempted: Object.values(progress).filter(p => p.status === 'attempted').length,
    totalHistory: history.length,
    dailyStats,
    recentQuestions
  };
}

/**
 * 获取用户做题热力图数据
 */
export function getUserHeatmap() {
  const user = getCurrentUser();
  if (!user) return [];
  
  const history = getHistory();
  const dateMap = {};
  
  history.forEach(record => {
    const date = record.timestamp.split('T')[0];
    if (!dateMap[date]) {
      dateMap[date] = { date, count: 0, actions: [] };
    }
    dateMap[date].count++;
    dateMap[date].actions.push(record.action);
  });
  
  return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
}
