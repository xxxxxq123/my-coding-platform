// 全局变量：按账号隔离数据
let currentUserKey = '';
let userInfo = {
  account: '',
  name: '',
  className: ''
};
// 🔥 修复1：题目进度改为5道题
let problemProgress = {
  1: false,
  2: false,
  3: false,
  4: false,
  5: false
};

// ========== 🔥 公告全局变量 ==========
let noticeList = [];        // 公告列表
let currentNoticePage = 1;  // 当前页码
const noticePerPage = 1;    // 每页1条公告

// ========== 班级功能全局变量 ==========
let membersVisible = false; // 班级成员面板显示状态

// 核心：按账号加载用户信息和进度
window.loadUserInfoByKey = function(userKey) {
  currentUserKey = userKey;
  // 读取当前登录用户信息（包含账号）
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  userInfo.account = currentUser.account || '';
  userInfo.name = currentUser.name || '';
  userInfo.className = currentUser.className || '';
  userInfo.classCode = currentUser.classCode || '';
  // 🔥 修复2：读取该账号的专属进度（默认5道题）
  problemProgress = JSON.parse(localStorage.getItem(userKey) || '{"1":false,"2":false,"3":false,"4":false,"5":false}');
  
  // 加载公告（登录后自动加载）
  loadMyClassNotices();
  // 加载班级信息
  loadMyClass();
  loadMyClassOptions();
};

// 保存进度到当前账号的专属存储
function saveProgressData() {
  if (currentUserKey) {
    localStorage.setItem(currentUserKey, JSON.stringify(problemProgress));
    localStorage.setItem('problemProgress', JSON.stringify(problemProgress));
  }
}

// 标记题目完成 + 进度更新
function markProblemCompleted(problemId) {
  if (!problemProgress[problemId]) {
    problemProgress[problemId] = true;
    saveProgressData();
    
    if (window.updateProgressDisplay) {
      window.updateProgressDisplay();
    }
    
    playSuccessSound();
    
    const completedCount = Object.values(problemProgress).filter(Boolean).length;
    const totalCount = Object.keys(problemProgress).length;
    if (completedCount === totalCount) {
      triggerCelebrationAnimation();
      alert('🎉 恭喜你完成所有题目！');
    } else {
      triggerSimpleCelebration();
    }
  }
}

// 播放成功音效
function playSuccessSound() {
  const sound = document.getElementById('successSound');
  if (sound) {
    try {
      sound.currentTime = 0;
      sound.play();
    } catch (e) {
      console.log('音效播放失败（浏览器限制）：', e);
    }
  }
}

// 显示加载动画
function showLoadingAnimation() {
  const loading = document.getElementById('loadingAnimation');
  if (loading) loading.style.display = 'block';
}

// 隐藏加载动画
function hideLoadingAnimation() {
  const loading = document.getElementById('loadingAnimation');
  if (loading) loading.style.display = 'none';
}

// 全屏庆祝动画（完成所有题目，延长至10秒）
function triggerCelebrationAnimation() {
  const container = document.getElementById('celebrationAnimation');
  if (!container) return;
  
  container.style.display = 'block';
  container.innerHTML = '';
  
  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    const colors = ['#f2d74e', '#95c3de', '#ff9a91', '#97d5a8', '#c994e1'];
    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.left = `${Math.random() * 100}%`;
    confetti.style.width = `${5 + Math.random() * 10}px`;
    confetti.style.height = `${5 + Math.random() * 10}px`;
    confetti.style.animationDelay = `${Math.random() * 2}s`;
    confetti.style.animationDuration = `${3 + Math.random() * 2}s`;
    
    container.appendChild(confetti);
  }
  
  // 延长动画显示时间至10秒
  setTimeout(() => container.style.display = 'none', 10000);
}

// 简单庆祝动画（完成单个题目）
function triggerSimpleCelebration() {
  const progressContainer = document.getElementById('progressContainer');
  if (progressContainer) {
    progressContainer.style.transform = 'scale(1.05)';
    progressContainer.style.transition = 'transform 0.3s ease';
    setTimeout(() => progressContainer.style.transform = 'scale(1)', 300);
  }
}

// 全局runCode函数：核心运行逻辑（隐藏前置提示+整合账号体系+修复提交记录）
async function runCode() {
  const codeEditor = document.getElementById('code');
  const output = document.getElementById('output');
  const problemSelector = document.getElementById('problemSelector');
  const code = codeEditor.value;
  const problemId = parseInt(problemSelector?.value);

  // 1. 调用code-runner的前置校验
  const checkResult = window.preCheckBeforeRun(problemId, code);
  if (!checkResult.pass) {
    output.innerHTML = `<p style="color: #c62828;">❌ ${checkResult.message}</p>`;
    return;
  }

  // 2. 基础初始化（清空输出，隐藏前置提示）
  showLoadingAnimation();
  output.innerHTML = "";

  // 3. 校验云环境
  if (!window.cloudDb) {
    hideLoadingAnimation();
    output.innerHTML += `<p style="color: #c62828;">❌ 云环境未初始化，请先点击「测试云连接」按钮！</p>`;
    alert('❌ 请先点击「测试云连接」完成云开发初始化！');
    return;
  }

  // 4. 模拟执行代码
  let simulationResult = null;
  try {
    const codeSimulator = window.codeSimulator || new CodeSimulator();
    simulationResult = codeSimulator.simulateExecution(code, problemId);
    
    // 渲染执行结果
    renderSimulationResult(output, simulationResult, problemId);
    
    // 满分则标记完成
    if (simulationResult.success && simulationResult.score === 100) {
      markProblemCompleted(problemId);
    }
  } catch (simErr) {
    output.innerHTML += `<p style="color: #c62828;">❌ 代码模拟执行失败：${simErr.message}</p>`;
    console.error('代码模拟执行失败', simErr);
  } finally {
    hideLoadingAnimation();
  }

  // 5. 构造当前登录用户数据并写入云数据库（核心修复：确保所有运行都生成提交记录）
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const realAccount = currentUser.account || '';
  const realName = currentUser.name || '';
  const realClassName = currentUser.className || '';

  const submitData = {
    account: realAccount, // 记录登录账号
    name: realName,
    className: realClassName,
    age: Math.floor(Math.random() * 5) + 18,
    createTime: new Date(), // 云数据库时间格式
    isTestData: !realAccount,
    problemId: problemId,
    problemTitle: (window.codeSimulator || new CodeSimulator()).getProblemById(problemId)?.title || '未知题目',
    userCode: code,
    simulationResult: simulationResult ? {
      success: simulationResult.success,
      score: simulationResult.score,
      output: simulationResult.output,
      expectedOutput: simulationResult.expectedOutput,
      errors: simulationResult.errors,
      feedback: simulationResult.feedback,
      completed: simulationResult.success && simulationResult.score === 100
    } : null
  };

  // 读取现有提交记录
  let allSubmits = JSON.parse(localStorage.getItem('students_submit') || '[]');
  // 过滤掉当前学生当前题目的旧记录（避免重复）
  allSubmits = allSubmits.filter(item => 
    !(item.account === submitData.account && item.problemId === submitData.problemId)
  );
  // 添加新记录
  allSubmits.push(submitData);
  // 重新保存到本地
  localStorage.setItem('students_submit', JSON.stringify(allSubmits));

  // 写入云数据库（调用封装的同步函数）
  await saveStudentSubmitData(submitData);
}

// 渲染模拟执行结果
function renderSimulationResult(output, result, problemId) {
  const problem = (window.codeSimulator || new CodeSimulator()).getProblemById(problemId);
  let simHtml = `
<hr style="border: 1px solid #eee; margin: 10px 0;">
<h4>🔍 代码模拟执行分析（题目：${problem?.title || '未知'}）</h4>
`;

  // 执行状态
  simHtml += result.success 
    ? `<p style="color: #2e7d32;">✅ 模拟执行成功</p>` 
    : `<p style="color: #c62828;">❌ 模拟执行失败</p>`;

  // 输出对比
  simHtml += `
<div style="margin: 8px 0;">
  <p>💻 模拟输出：<strong>${result.output || '无'}</strong></p>
  <p>🎯 预期输出：<strong>${result.expectedOutput || '无'}</strong></p>
</div>
`;

  // 执行统计
  simHtml += `<div style="color: #1976d2; margin: 8px 0;">
    🕒 执行时间：${result.execTime.toFixed(4)}秒 | 
    📦 内存使用：${result.memoryUsed}KB | 
    🏆 得分：${result.score}/100
</div>`;

  // 反馈信息
  simHtml += `<div style="background: #f3e5f5; padding: 8px; border-radius: 4px; margin: 8px 0;">
    💡 反馈：${result.feedback}
</div>`;

  // 错误列表
  if (result.errors.length > 0) {
    simHtml += `<div style="color: #c62828;">
      <p>❌ 错误列表：</p>
      <ul>${result.errors.map(err => `<li>${err}</li>`).join('')}</ul>
    </div>`;
  }

  // 警告列表
  if (result.warnings.length > 0) {
    simHtml += `<div style="color: #ff8f00; background: #fff8e1; padding: 8px; border-radius: 4px;">
      <p>⚠️ 警告列表：</p>
      <ul>${result.warnings.map(warn => `<li>${warn}</li>`).join('')}</ul>
    </div>`;
  }

  // 下一步建议
  simHtml += `<div style="background: #e1f5fe; padding: 10px; border-radius: 4px; margin-top: 10px;">
    📝 下一步建议：${getSuggestion(result, problemId)}
  </div>`;

  output.innerHTML += simHtml;
}

// 🔥 修复3：生成5道题专属下一步建议
function getSuggestion(result, problemId) {
  if (!result.success) {
    return '先修复代码中的错误（红色标注），再重新运行哦～';
  }
  if (result.score === 100) {
    return '太棒了！代码完全正确，可以尝试挑战更难的题目啦～';
  }
  switch (problemId) {
    case 1:
      return '检查cout输出的内容是不是"Hello"，注意大小写哦～';
    case 2:
      return '确认计算的是10+20，并且输出的是结果30哦～';
    case 3:
      return '检查取模运算num%2，判断数字7的奇偶性哦～';
    case 4:
      return '检查for循环1-10累加，最终输出结果55哦～';
    case 5:
      return '遍历数组找出最大值9，正确输出即可得分～';
    default:
      return '建议仔细检查输出内容是否和预期一致～';
  }
}

/**
 * 保存学生提交数据到本地+云数据库
 * @param {object} submitData 提交数据对象
 */
async function saveStudentSubmitData(submitData) {
  // 1. 补充班级码和用户信息
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  submitData.classCode = currentUser.classCode || '';
  submitData.studentId = currentUser.account || '';
  submitData.createTime = new Date(); // 云数据库时间格式

  // 2. 写入云数据库submissions集合（本地记录已在runCode中处理，此处仅同步云）
  if (window.cloudDbUtils) {
    try {
      // 写入代码提交记录到submissions集合
      const submitRes = await cloudDbUtils.add('submissions', submitData);
      if (submitRes.success) {
        console.log('✅ 提交记录写入云数据库成功，ID：', submitRes.id);
      }

      // 同步更新students集合（学生基础信息）
      const studentWhere = { account: currentUser.account };
      const studentRes = await cloudDbUtils.query('students', studentWhere);
      
      if (studentRes.success && studentRes.data.length === 0) {
        // 新增学生信息
        await cloudDbUtils.add('students', {
          account: currentUser.account,
          name: currentUser.name,
          className: currentUser.className,
          classCode: currentUser.classCode,
          createTime: new Date(),
          lastLoginTime: new Date()
        });
      } else if (studentRes.success && studentRes.data.length > 0) {
        // 更新学生最后登录时间
        const studentId = studentRes.data[0]._id;
        await cloudDbUtils.update('students', studentId, {
          lastLoginTime: new Date()
        });
      }
    } catch (e) {
      console.error('❌ 云数据同步失败：', e);
      // 页面提示（可选）
      const output = document.getElementById('output');
      if (output) {
        output.innerHTML += `<p style="color: #ff8f00;">⚠️ 本地数据保存成功，但云同步失败：${e.message}</p>`;
      }
    }
  }
}

/**
 * 同步班级信息到云数据库
 * @param {object} classData 班级数据对象
 */
async function syncClassToCloud(classData) {
  if (!window.cloudDbUtils) return;
  try {
    // 补充教师信息和时间
    classData.teacherAccount = window.currentTeacher?.account || '';
    classData.teacherName = window.currentTeacher?.name || '';
    classData.createTime = new Date();
    
    // 写入classes集合
    const res = await cloudDbUtils.add('classes', classData);
    if (res.success) {
      console.log('✅ 班级信息写入云数据库成功，ID：', res.id);
    }
  } catch (e) {
    console.error('❌ 班级信息云同步失败：', e);
  }
}

// ========== 学生绑定班级码（自动加入班级列表） ==========
window.bindStudentClassCode = async function(classCode) {
  if (!classCode) {
    alert('请输入有效的班级码！');
    return;
  }

  // 1. 更新学生自己的信息
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  if (!currentUser.account) {
    alert('请先登录/注册账号后再绑定班级码！');
    return;
  }
  currentUser.classCode = classCode;
  localStorage.setItem('currentUser', JSON.stringify(currentUser));

  // 2. 找到对应班级，把学生账号加入班级的 students 数组
  const classes = JSON.parse(localStorage.getItem('classes') || '[]');
  const targetClass = classes.find(cls => cls.code === classCode);
  
  if (!targetClass) {
    alert('❌ 未找到该班级码对应的班级，请确认班级码是否正确！');
    return;
  }

  // 避免重复加入
  if (!targetClass.students.includes(currentUser.account)) {
    targetClass.students.push(currentUser.account);
    // 同步更新本地存储
    localStorage.setItem('classes', JSON.stringify(classes));

    // 如果云数据库已初始化，同步到云
    if (window.cloudDbUtils) {
      // 先查询云数据库里的班级ID
      const cloudClass = await cloudDbUtils.query('classes', { code: classCode });
      if (cloudClass.success && cloudClass.data.length > 0) {
        const classId = cloudClass.data[0]._id;
        await cloudDbUtils.update('classes', classId, {
          students: targetClass.students
        });
      }
    }
  }

  alert(`✅ 班级码 ${classCode} 绑定成功！你已加入【${targetClass.name}】`);
  loadMyClassNotices();
  loadMyClass();
  loadMyClassOptions();
};

// ==============================================
// 🔥 班级功能（成员、退出、排名）
// ==============================================
window.toggleClassMembers = function() {
  const box = document.getElementById('classMembersBox');
  membersVisible = !membersVisible;
  box.style.display = membersVisible ? 'block' : 'none';
};

window.loadMyClass = function() {
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const classes = JSON.parse(localStorage.getItem('classes') || '[]');
  const infoBox = document.getElementById('myClassInfo');
  const membersBox = document.getElementById('classMembersBox');
  const membersList = document.getElementById('classMembersList');

  if (!user.classCode) {
    infoBox.innerHTML = '<p class="empty-tip">请先加入班级</p>';
    membersBox.style.display = 'none';
    return;
  }

  const myClass = classes.find(c => c.code === user.classCode);
  if (!myClass) {
    infoBox.innerHTML = '<p class="empty-tip">班级不存在或已删除</p>';
    membersBox.style.display = 'none';
    return;
  }

  // 🔥 两个按钮并排：查看班级成员 + 退出班级
  infoBox.innerHTML = `
    <div class="class-item">
      <h4>${myClass.name}</h4>
      <p>班级码：${myClass.code}</p>
      <p>人数：${myClass.students?.length || 0} 人</p>
      <div style="display: flex; gap: 10px; margin-top:10px;">
        <button onclick="toggleClassMembers()" style="padding:6px 12px;background:#009688;color:white;border:none;border-radius:4px;cursor:pointer;">
          👥 查看班级成员
        </button>
        <button onclick="quitClass()" style="padding:6px 12px;background:#f44336;color:white;border:none;border-radius:4px;">
          退出班级
        </button>
      </div>
    </div>
  `;

  membersBox.style.display = 'none';

  // 加载成员（🔥 新增：判断是否是当前用户，添加高亮类名）
  const users = JSON.parse(localStorage.getItem('users') || '{}');
  let html = '';
  (myClass.students || []).forEach(account => {
    const u = users[account];
    if (u) {
      html += `<div class="student-item ${account === user.account ? 'self-highlight' : ''}">${u.name}（${account}）</div>`;
    }
  });
  membersList.innerHTML = html;
};

// 退出班级
window.quitClass = function() {
  if (!confirm('确定要退出班级吗？')) return;
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  if (!user.classCode) { alert('你未加入班级'); return; }

  const oldCode = user.classCode;
  user.classCode = '';
  localStorage.setItem('currentUser', JSON.stringify(user));

  const classes = JSON.parse(localStorage.getItem('classes') || []);
  const cls = classes.find(c => c.code === oldCode); // 🔥 修复：原代码是 c => code === oldCode，少了c.
  if (cls) {
    cls.students = cls.students.filter(s => s !== user.account);
    localStorage.setItem('classes', JSON.stringify(classes));
  }

  alert('已退出班级');
  loadMyClass();
  loadMyClassNotices();
  loadMyClassOptions();
};

// 首页加载班级选项
window.loadMyClassOptions = function() {
  const sel = document.getElementById('homeClassSelector');
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const classes = JSON.parse(localStorage.getItem('classes') || '[]');

  sel.innerHTML = '<option value="">-- 选择班级 --</option>';
  if (!user.classCode) return;

  const myCls = classes.find(c => c.code === user.classCode);
  if (myCls) {
    const opt = document.createElement('option');
    opt.value = myCls.code;
    opt.textContent = myCls.name;
    sel.appendChild(opt);
  }
};

// 班级排名（🔥 新增：判断是否是当前用户，添加高亮类名）
window.loadClassRanking = function() {
  const classCode = document.getElementById('homeClassSelector').value;
  const listEl = document.getElementById('rankingList');
  if (!classCode) { listEl.innerHTML = '<p class="empty-tip">请选择班级</p>'; return; }

  const classes = JSON.parse(localStorage.getItem('classes') || []);
  const cls = classes.find(c => c.code === classCode);
  if (!cls) { listEl.innerHTML = '<p class="empty-tip">班级不存在</p>'; return; }

  const users = JSON.parse(localStorage.getItem('users') || {});
  const ranks = [];
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}'); // 🔥 获取当前登录用户

  (cls.students || []).forEach(account => {
    const u = users[account];
    if (!u) return;
    // 🔥 修复4：读取5题进度
    const progress = JSON.parse(localStorage.getItem(`student_${account}`) || '{"1":false,"2":false,"3":false,"4":false,"5":false}');
    const total = Object.values(progress).filter(v => v === true).length;
    // 🔥 修复5：按5题计算进度百分比
    const rate = Math.round((total / 5) * 100);
    ranks.push({ name: u.name, account, rate, total });
  });

  ranks.sort((a, b) => b.rate - a.rate);

  let html = '';
  ranks.forEach((r, i) => {
    // 🔥 显示5题完成进度 + 自我标注高亮
    html += `
      <div class="student-item ${r.account === currentUser.account ? 'self-highlight' : ''}">
        第${i+1}名　${r.name}　完成 ${r.total}/5题　${r.rate}%
      </div>
    `;
  });

  listEl.innerHTML = html || '<p class="empty-tip">暂无成员</p>';
};

// 加载当前班级的所有公告
window.loadMyClassNotices = function() {
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const allNotices = JSON.parse(localStorage.getItem('notices') || '[]');
  const classes = JSON.parse(localStorage.getItem('classes') || '[]');
  
  noticeList = allNotices.filter(notice => notice.classCode === user.classCode);
  currentNoticePage = 1;
  
  // 按时间倒序（最新的在前）
  noticeList.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
  
  renderCurrentNoticePage();
  checkNewNoticeBadge();
};

// 渲染当前页公告
window.renderCurrentNoticePage = function() {
  const box = document.getElementById('noticeBox');
  const pageText = document.getElementById('noticePage');
  
  if (noticeList.length === 0) {
    box.innerHTML = '📭 暂无班级公告';
    pageText.textContent = '1/1';
    return;
  }
  
  const totalPage = Math.ceil(noticeList.length / noticePerPage);
  const start = (currentNoticePage - 1) * noticePerPage;
  const notice = noticeList[start];
  
  // 显示：班级 + 老师 + 内容 + 时间
  box.innerHTML = `
    <div style="line-height:1.6;">
      <div style="font-size:14px; color:#666; margin-bottom:6px;">
        🏫 ${notice.className} · 👨‍🏫 ${notice.teacherName} 老师
      </div>
      <div style="font-size:15px; color:#333;">${notice.content}</div>
      <div style="font-size:12px; color:#999; margin-top:8px;">
        ${new Date(notice.createTime).toLocaleString()}
      </div>
    </div>
  `;
  
  pageText.textContent = `${currentNoticePage}/${totalPage}`;
};

// 上一页
window.prevNotice = function() {
  if (currentNoticePage > 1) {
    currentNoticePage--;
    renderCurrentNoticePage();
  }
};

// 下一页
window.nextNotice = function() {
  const total = Math.ceil(noticeList.length / noticePerPage);
  if (currentNoticePage < total) {
    currentNoticePage++;
    renderCurrentNoticePage();
  }
};

// 新公告红点提示
window.checkNewNoticeBadge = function() {
  const badge = document.getElementById('noticeBadge');
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  if (!user.classCode || noticeList.length === 0) {
    badge.style.display = 'none';
    return;
  }
  
  // 有公告就显示提示
  badge.style.display = 'inline';
};

// ========== 暴露全局方法 ==========
window.runCode = runCode;
window.saveStudentSubmitData = saveStudentSubmitData;
window.syncClassToCloud = syncClassToCloud;

// 云状态更新函数
if (typeof updateCloudStatus === 'undefined') {
  window.updateCloudStatus = function(type, msg) {
    const cloudStatus = document.getElementById('cloudStatus');
    if (!cloudStatus) return;
    cloudStatus.className = type;
    cloudStatus.innerHTML = msg;
  };
}