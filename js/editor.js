// =====================================================
// EDITOR MODULE - CodeMirror编辑器管理
// =====================================================

import { currentQuestion, currentLang, setLang, markSolved, isLoggedIn, addHistoryRecord } from './state.js';
import { escapeHtml, recordCodeRun, recordQuestionSolve } from './ui.js';

// CodeMirror实例
let editor = null;

// 语言模式映射
const MODE_MAP = {
  javascript: 'javascript',
  python: 'python',
  java: 'text/x-java',
  cpp: 'text/x-c++src',
  go: 'text/x-go'
};

// 语言名称映射
const LANG_NAMES = {
  javascript: 'JavaScript',
  python: 'Python',
  java: 'Java',
  cpp: 'C++',
  go: 'Go'
};

/**
 * 初始化编辑器
 */
export function initEditor(question) {
  const code = question.starterCode[currentLang] || '// 在此编写代码\n';

  // 如果已有编辑器实例，先销毁
  if (editor) {
    editor.toTextArea();
  }

  const textarea = document.getElementById('codeEditor');
  if (!textarea) return;

  textarea.value = code;

  // 创建CodeMirror实例
  editor = CodeMirror.fromTextArea(textarea, {
    mode: MODE_MAP[currentLang] || 'javascript',
    theme: 'dracula',
    lineNumbers: true,
    indentUnit: 2,
    tabSize: 2,
    matchBrackets: true,
    autoCloseBrackets: true,
    lineWrapping: true,
    viewportMargin: Infinity
  });

  // 绑定快捷键
  editor.setOption('extraKeys', {
    'Ctrl-Enter': () => runCode(),
    'Cmd-Enter': () => runCode()
  });

  editor.refresh();
}

/**
 * 切换语言
 */
export function switchLang(lang) {
  if (!currentQuestion || !editor) return;

  setLang(lang);

  // 更新标签样式
  document.querySelectorAll('.lang-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.lang === lang);
  });

  // 更新编辑器内容
  const code = currentQuestion.starterCode[lang] || '// 在此编写代码\n';
  editor.setValue(code);
  editor.setOption('mode', MODE_MAP[lang] || 'javascript');
  editor.refresh();

  // 隐藏输出面板
  const outputPanel = document.getElementById('outputPanel');
  if (outputPanel) outputPanel.style.display = 'none';
}

/**
 * 重置代码
 */
export function resetCode() {
  if (!currentQuestion || !editor) return;

  const code = currentQuestion.starterCode[currentLang] || '// 在此编写代码\n';
  editor.setValue(code);

  const outputPanel = document.getElementById('outputPanel');
  if (outputPanel) outputPanel.style.display = 'none';
}

/**
 * 运行代码
 */
export function runCode() {
  if (!currentQuestion || !editor) return;

  const code = editor.getValue();
  const outputPanel = document.getElementById('outputPanel');
  const outputBody = document.getElementById('outputBody');
  const statusDot = document.getElementById('outputStatusDot');
  const statusText = document.getElementById('outputStatusText');

  if (outputPanel) outputPanel.style.display = 'block';

  if (currentLang === 'javascript') {
    // 实际运行JavaScript代码
    try {
      const logs = [];
      const mockConsole = {
        log: (...args) => logs.push(args.map(a => JSON.stringify(a)).join(' ')),
        error: (...args) => logs.push('ERROR: ' + args.join(' ')),
        warn: (...args) => logs.push('WARN: ' + args.join(' '))
      };

      const fn = new Function('console', code + '\nreturn typeof module !== "undefined" ? module.exports : undefined;');
      const result = fn(mockConsole);

      let output = '';
      if (logs.length > 0) {
        output += logs.map(l => `<div>${escapeHtml(l)}</div>`).join('');
      }
      if (result !== undefined) {
        output += `<div style="color:var(--accent-green);margin-top:8px;">返回值: ${escapeHtml(JSON.stringify(result))}</div>`;
      }

      if (!output) {
        output = '<div style="color:var(--text-muted);">代码执行成功，无输出</div>';
      }

      if (outputBody) outputBody.innerHTML = output;
      if (statusDot) {
        statusDot.className = 'status-dot pass';
        statusDot.style.background = 'var(--accent-green)';
      }
      if (statusText) statusText.textContent = '运行成功';

      // 标记为已解决
      markSolved(currentQuestion.id);
      
      // 记录做题历史
      recordQuestionSolve(currentQuestion.id, { lang: currentLang });
      recordCodeRun(currentQuestion.id, currentLang, true);
      
    } catch (err) {
      if (outputBody) {
        outputBody.innerHTML = `<div style="color:var(--accent-red);">${escapeHtml(err.toString())}</div>`;
      }
      if (statusDot) {
        statusDot.className = 'status-dot fail';
        statusDot.style.background = 'var(--accent-red)';
      }
      if (statusText) statusText.textContent = '运行出错';
      
      // 记录运行失败
      recordCodeRun(currentQuestion.id, currentLang, false);
    }
  } else {
    // Python/Java/C++/Go: 显示提示信息
    const langLabel = LANG_NAMES[currentLang] || currentLang;
    if (outputBody) {
      outputBody.innerHTML = `
        <div style="color:var(--text-muted);padding:8px 0;">
          &#9888; ${langLabel} 代码无法在浏览器中直接运行。<br><br>
          请参考题解对比你的实现，或在本地环境中运行测试。<br>
          <span style="color:var(--accent-cyan);cursor:pointer;" onclick="window.showSolution()">点击查看参考题解 &#8594;</span>
        </div>
      `;
    }
    if (statusDot) {
      statusDot.className = 'status-dot';
      statusDot.style.background = 'var(--accent-amber)';
    }
    if (statusText) statusText.textContent = '提示';
  }
}

/**
 * 显示题解
 */
export function showSolution() {
  if (!currentQuestion) return;

  const sol = currentQuestion.solution[currentLang] || '// 暂无该语言的题解';
  const explanation = currentQuestion.explanation || '';

  const solutionContent = document.getElementById('solutionContent');
  if (solutionContent) {
    solutionContent.innerHTML = `
      <p style="color:var(--text-muted);margin-bottom:12px;">当前语言: <strong style="color:var(--accent-cyan);">${LANG_NAMES[currentLang]}</strong></p>
      <pre><code>${escapeHtml(sol)}</code></pre>
      ${explanation ? `<div class="explanation"><strong style="color:var(--accent-green);">解析：</strong><br>${explanation}</div>` : ''}
      <div style="margin-top:16px;text-align:center;">
        <button class="action-btn btn-run" onclick="window.loadSolution()" style="margin:0 auto;">&#128260; 加载题解到编辑器</button>
      </div>
    `;
  }

  const overlay = document.getElementById('solutionOverlay');
  if (overlay) overlay.classList.add('show');
}

/**
 * 关闭题解弹窗
 */
export function closeSolution(event) {
  if (event && event.target !== event.currentTarget) return;

  const overlay = document.getElementById('solutionOverlay');
  if (overlay) overlay.classList.remove('show');
}

/**
 * 加载题解到编辑器
 */
export function loadSolution() {
  if (!currentQuestion || !editor) return;

  const sol = currentQuestion.solution[currentLang];
  if (sol) {
    editor.setValue(sol);
    editor.refresh();
  }
  closeSolution();
}

/**
 * 获取编辑器实例
 */
export function getEditor() {
  return editor;
}
