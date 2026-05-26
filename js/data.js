// =====================================================
// DATA MODULE - 数据加载和管理
// =====================================================

// 分类定义
export let CATEGORIES = {};

// 所有题目数据
export let questions = [];

// 数据文件映射
const DATA_FILES = {
  cpp: 'data/cpp.json',
  os: 'data/os.json',
  python: 'data/python.json',
  algorithm: 'data/algorithm.json',
  testing: 'data/testing.json',
  shell: 'data/shell.json'
};

/**
 * 加载分类定义
 */
async function loadCategories() {
  try {
    // 尝试从JSON文件加载
    const response = await fetch('data/categories.json');
    if (response.ok) {
      const data = await response.json();
      CATEGORIES = data.categories || {};
      return;
    }
  } catch (e) {
    console.warn('无法从JSON加载分类，使用内置默认值');
  }

  // 内置默认分类
  CATEGORIES = {
    cpp: {
      name: 'C/C++',
      icon: '&#9881;',
      color: '#00599c',
      desc: '指针内存、STL容器、面向对象、模板元编程、多线程并发、编译链接等'
    },
    os: {
      name: '操作系统',
      icon: '&#128187;',
      color: '#a855f7',
      desc: '进程线程、内存管理、文件系统、IO、调度算法、同步互斥等'
    },
    python: {
      name: 'Python',
      icon: '&#128013;',
      color: '#3776ab',
      desc: '基础语法、面向对象、装饰器、生成器、GIL、并发编程、异步IO等'
    },
    algorithm: {
      name: '算法题',
      icon: '&#128640;',
      color: '#ef4444',
      desc: 'LeetCode经典题目，数组、链表、树、动态规划、回溯等核心算法'
    },
    testing: {
      name: '自动化测试',
      icon: '&#9989;',
      color: '#22c55e',
      desc: '单元测试、集成测试、Web/API自动化、性能测试、CI/CD、安全测试等'
    },
    shell: {
      name: 'Shell脚本',
      icon: '&#62;',
      color: '#4ade80',
      desc: 'Bash基础、文本处理(grep/sed/awk)、进程管理、脚本调试、最佳实践等'
    }
  };
}

/**
 * 加载所有题目数据
 */
async function loadQuestions() {
  const loadedQuestions = [];

  for (const [category, filePath] of Object.entries(DATA_FILES)) {
    let success = false;
    for (let retry = 0; retry < 3 && !success; retry++) {
      try {
        const response = await fetch(filePath + (retry > 0 ? '?retry=' + retry : ''));
        if (response.ok) {
          const data = await response.json();
          if (data.questions && Array.isArray(data.questions)) {
            loadedQuestions.push(...data.questions);
            success = true;
          }
        }
      } catch (e) {
        if (retry === 2) console.warn(`加载 ${filePath} 失败:`, e.message);
      }
    }
  }

  questions = loadedQuestions;
  console.log(`已加载 ${questions.length} 道题目`);
}

/**
 * 初始化数据
 */
export async function initData() {
  await loadCategories();
  await loadQuestions();
}

/**
 * 获取指定分类的题目
 */
export function getQuestionsByCategory(category) {
  return questions.filter(q => {
    // 支持categories数组或单个category
    if (q.categories && Array.isArray(q.categories)) {
      return q.categories.includes(category);
    }
    return q.category === category;
  });
}

/**
 * 获取所有题目
 */
export function getQuestions() {
  return questions;
}

/**
 * 根据ID获取题目
 */
export function getQuestionById(id) {
  return questions.find(q => q.id === id);
}

/**
 * 搜索题目
 */
export function searchQuestions(query) {
  const lowerQuery = query.toLowerCase();
  return questions.filter(q => {
    const desc = (q.description || q.content || '').toLowerCase();
    const cat = (q.category || (q.categories && q.categories[0]) || '').toLowerCase();
    return q.title.toLowerCase().includes(lowerQuery) ||
      q.tags.some(t => t.toLowerCase().includes(lowerQuery)) ||
      cat.includes(lowerQuery) ||
      desc.includes(lowerQuery);
  });
}

/**
 * 获取题目总数
 */
export function getTotalCount() {
  return questions.length;
}

/**
 * 获取各难度题目数量
 */
export function getDifficultyCounts() {
  return {
    easy: questions.filter(q => q.difficulty === 'easy').length,
    medium: questions.filter(q => q.difficulty === 'medium').length,
    hard: questions.filter(q => q.difficulty === 'hard').length
  };
}
