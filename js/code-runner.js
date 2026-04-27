// js/code-runner.js
// 代码运行前置校验工具：语法检查、参数校验、用户信息校验

/**
 * 1. 简单C++语法基础检查（适配小学生编程场景）
 * @param {string} code - 学生编写的代码
 * @returns {string|null} 错误信息（无错误返回null）
 */
function checkCppBasicSyntax(code) {
  // 空代码校验
  if (!code.trim()) {
    return '代码编辑器不能为空，请输入代码后再运行！';
  }
  // 必须包含main函数（C++入口）
  if (!code.includes('main()')) {
    return '缺少main()函数！C++程序必须有main()作为入口哦～';
  }
  // 输出语句必须包含分号（基础语法）
  if (code.includes('cout') && !code.includes(';')) {
    return 'cout语句末尾缺少分号;！C++语句要以分号结尾哦～';
  }
  // 无语法错误
  return null;
}

/**
 * 2. 运行代码前的全量前置校验
 * @param {number} problemId - 选中的题目ID
 * @param {string} code - 学生编写的代码
 * @returns {object} { pass: boolean, message: string }
 */
function preCheckBeforeRun(problemId, code) {
  // 校验1：是否选择题目
  if (!problemId || isNaN(problemId)) {
    return { pass: false, message: '请先选择左侧的编程题目！' };
  }
  // 校验2：代码语法基础检查
  const syntaxError = checkCppBasicSyntax(code);
  if (syntaxError) {
    return { pass: false, message: `语法检查失败：${syntaxError}` };
  }
  // 校验3：区分学生/教师端，教师端跳过用户信息校验
  const isTeacherPage = window.location.pathname.includes('teacher.html');
  if (isTeacherPage) {
    return { pass: true, message: '教师端跳过用户信息校验' };
  }
  // 学生端校验用户信息
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  if (!currentUser.name || !currentUser.className) {
    return { pass: false, message: '请先输入姓名和班级信息后再运行代码！' };
  }
  // 所有校验通过
  return { pass: true ,message: '运行代码！'};
}

/**
 * 3. 辅助函数：格式化代码输出（避免乱码/过长）
 * @param {string} code - 原始代码
 * @returns {string} 格式化后的代码片段
 */
function formatCodePreview(code) {
  if (!code) return '无代码';
  // 截取前200字符 + 省略号（避免输出过长）
  const preview = code.substring(0, 200);
  return code.length > 200 ? `${preview}...` : preview;
}

// 暴露全局方法，供main.js调用
window.checkCppBasicSyntax = checkCppBasicSyntax;
window.preCheckBeforeRun = preCheckBeforeRun;
window.formatCodePreview = formatCodePreview;