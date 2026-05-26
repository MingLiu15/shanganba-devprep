// =====================================================
// MAIN ENTRY - 应用入口点
// =====================================================

import { initData, questions, CATEGORIES } from './data.js';
import { 
  updateStreak, 
  getCurrentUser, loginUser, logoutUser, registerUser, isLoggedIn,
  addHistoryRecord, getUserStats 
} from './state.js';
import { renderHome, refreshUI, updateUserUI } from './ui.js';
import {
  navigateTo, navigateToCategory, navigateToQuestion,
  toggleSidebar, handleSearch, filterQuestions, filterByFrequency, handleResetProgress,
  initRouter
} from './router.js';
import { switchLang, resetCode, runCode, showSolution, closeSolution, loadSolution, initEditor } from './editor.js';

// 将函数暴露到全局，供HTML内联事件调用
window.navigateTo = navigateTo;
window.navigateToCategory = navigateToCategory;
window.navigateToQuestion = navigateToQuestion;
window.toggleSidebar = toggleSidebar;
window.handleSearch = handleSearch;
window.filterQuestions = filterQuestions;
window.filterByFrequency = filterByFrequency;
window.resetProgress = handleResetProgress;
window.switchLang = switchLang;
window.resetCode = resetCode;
window.runCode = runCode;
window.showSolution = showSolution;
window.closeSolution = closeSolution;
window.loadSolution = loadSolution;
window.initCodingEditor = function(question) {
  initEditor(question);
};

// 登录相关函数暴露到全局
window.showLoginModal = showLoginModal;
window.closeLoginModal = closeLoginModal;
window.switchLoginTab = switchLoginTab;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.logout = logout;

/**
 * 初始化应用
 */
async function init() {
  console.log('上岸吧DevPrep 初始化中...');

  // 加载数据
  await initData();

  // 更新连续打卡
  updateStreak();

  // 更新用户UI
  updateUserUI();

  // 渲染首页
  renderHome();

  // 初始化路由
  initRouter();

  console.log('上岸吧DevPrep 初始化完成');
}

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', init);

// =====================================================
// 登录功能实现
// =====================================================

let currentLoginTab = 'login';

function showLoginModal() {
  const overlay = document.getElementById('loginOverlay');
  if (overlay) {
    overlay.classList.add('show');
    // 清空表单
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginError').textContent = '';
    document.getElementById('registerUsername').value = '';
    document.getElementById('registerPassword').value = '';
    document.getElementById('registerPassword2').value = '';
    document.getElementById('registerError').textContent = '';
  }
}

function closeLoginModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const overlay = document.getElementById('loginOverlay');
  if (overlay) {
    overlay.classList.remove('show');
  }
}

function switchLoginTab(tab) {
  currentLoginTab = tab;
  
  // 切换tab样式
  document.querySelectorAll('.login-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  
  // 切换表单
  document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
}

function handleLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  
  if (!username || !password) {
    errorEl.textContent = '请输入用户名和密码';
    return;
  }
  
  const result = loginUser(username, password);
  if (result.success) {
    closeLoginModal();
    updateUserUI();
    // 记录登录历史
    addHistoryRecord('system', 'login', { username });
  } else {
    errorEl.textContent = result.message;
  }
}

function handleRegister() {
  const username = document.getElementById('registerUsername').value.trim();
  const password = document.getElementById('registerPassword').value;
  const password2 = document.getElementById('registerPassword2').value;
  const errorEl = document.getElementById('registerError');
  
  if (!username || !password) {
    errorEl.textContent = '请输入用户名和密码';
    return;
  }
  
  if (username.length < 3 || username.length > 20) {
    errorEl.textContent = '用户名长度应为3-20字符';
    return;
  }
  
  if (password.length < 6) {
    errorEl.textContent = '密码长度至少6位';
    return;
  }
  
  if (password !== password2) {
    errorEl.textContent = '两次输入的密码不一致';
    return;
  }
  
  const result = registerUser(username, password);
  if (result.success) {
    // 自动登录
    const loginResult = loginUser(username, password);
    if (loginResult.success) {
      closeLoginModal();
      updateUserUI();
      addHistoryRecord('system', 'register', { username });
    }
  } else {
    errorEl.textContent = result.message;
  }
}

function logout() {
  if (confirm('确定要退出登录吗？')) {
    const user = getCurrentUser();
    if (user) {
      addHistoryRecord('system', 'logout', { username: user.username });
    }
    logoutUser();
    updateUserUI();
    navigateTo('home');
  }
}
