// 生成随机班级码（6位数字）
function generateClassCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 创建班级（同步到云数据库）
async function createClass() {
  const className = document.getElementById('classNameInput').value.trim();
  if (!className) {
    alert('请输入班级名称！');
    return;
  }

  const classId = 'class_' + Date.now();
  const classCode = generateClassCode();
  const newClass = {
    id: classId,
    name: className,
    code: classCode,
    teacherAccount: currentTeacher.account,
    teacherName: currentTeacher.name,
    createTime: new Date().toLocaleString(),
    students: []
  };

  const classes = JSON.parse(localStorage.getItem('classes') || '[]');
  classes.push(newClass);
  localStorage.setItem('classes', JSON.stringify(classes));

  await window.syncClassToCloud(newClass);

  document.getElementById('classNameInput').value = '';
  loadTeacherClasses();
  
  alert(`✅ 班级创建成功！
班级名称：${className}
班级码：${classCode}
请将班级码分享给学生，学生将自动加入该班级！`);
}

// 加载教师创建的所有班级
async function loadTeacherClasses() {
  let teacherClasses = [];
  if (window.cloudDbUtils) {
    const classRes = await cloudDbUtils.query('classes', {
      teacherAccount: currentTeacher.account
    });
    if (classRes.success && classRes.data.length > 0) {
      teacherClasses = classRes.data;
      localStorage.setItem('classes', JSON.stringify(classRes.data));
    }
  }

  if (teacherClasses.length === 0) {
    const classes = JSON.parse(localStorage.getItem('classes') || '[]');
    teacherClasses = classes.filter(cls => cls.teacherAccount === currentTeacher.account);
  }

  const classListEl = document.getElementById('classList');
  const classSelector = document.getElementById('classSelector');

  classListEl.innerHTML = '';
  classSelector.innerHTML = '<option value="">请选择要查看的班级</option>';

  if (teacherClasses.length === 0) {
    classListEl.innerHTML = '<p class="empty-tip">暂无创建的班级，点击上方按钮创建第一个班级吧！</p>';
    return;
  }

  teacherClasses.forEach((cls, index) => {
    const createTime = cls.createTime instanceof Date 
      ? cls.createTime.toLocaleString() 
      : cls.createTime;

    const studentCount = cls.students?.length || 0;

    const classItem = document.createElement('div');
    classItem.className = 'class-item';
    classItem.innerHTML = `
      <h4>${cls.name}</h4>
      <p>班级码：<span style="font-weight: bold; color: #1976d2;">${cls.code}</span></p>
      <p>创建时间：${createTime}</p>
      <p>学生数量：${studentCount} 人</p>
      <button onclick="copyClassCode('${cls.code}')" style="margin-right: 10px;">复制班级码</button>
      <button onclick="deleteClass(${index})" style="background: #f44336; color: white; border: none; border-radius: 4px; padding: 6px 12px; cursor: pointer;">
        🗑️ 删除班级
      </button>
    `;
    classListEl.appendChild(classItem);

    const option = document.createElement('option');
    option.value = cls.id || cls._id;
    option.textContent = cls.name + '（班级码：' + cls.code + '）';
    classSelector.appendChild(option);
  });
}

// 删除班级
async function deleteClass(classIndex) {
  if (!confirm('⚠️ 确认删除该班级吗？删除后班级数据将永久清除！')) {
    return;
  }

  let classes = JSON.parse(localStorage.getItem('classes') || '[]');
  const teacherClasses = classes.filter(cls => cls.teacherAccount === currentTeacher.account);

  if (classIndex < 0 || classIndex >= teacherClasses.length) {
    alert('❌ 班级索引无效！');
    return;
  }

  const deletedClass = teacherClasses[classIndex];
  const originalIndex = classes.findIndex(cls => 
    (cls.id || cls._id) === (deletedClass.id || deletedClass._id)
  );

  if (originalIndex !== -1) {
    classes.splice(originalIndex, 1);
    localStorage.setItem('classes', JSON.stringify(classes));
  }

  if (window.cloudDbUtils && deletedClass._id) {
    try {
      await cloudDbUtils.delete('classes', deletedClass._id);
    } catch (e) {
      console.error('云删除失败', e);
    }
  }

  await loadTeacherClasses();
  document.getElementById('studentList').innerHTML = '<p class="empty-tip">请重新选择班级</p>';
  document.getElementById('classSelector').value = '';
  alert(`✅ 班级【${deletedClass.name}】已删除`);
}

// 复制班级码
function copyClassCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    alert(`✅ 班级码 ${code} 已复制`);
  }).catch(() => {
    alert('❌ 复制失败，请手动记录：' + code);
  });
}

// 加载班级学生
async function loadStudentsByClass() {
  currentClassId = document.getElementById('classSelector').value;
  if (!currentClassId) {
    document.getElementById('studentList').innerHTML = '<p class="empty-tip">请先选择班级</p>';
    return;
  }

  const classes = JSON.parse(localStorage.getItem('classes') || '[]');
  const currentClass = classes.find(cls => (cls.id || cls._id) === currentClassId);
  if (!currentClass) { alert('未找到班级'); return; }

  let classStudents = [];
  if (window.cloudDbUtils) {
    const submitRes = await cloudDbUtils.query('submissions', {
      classCode: currentClass.code,
      isTestData: false
    });
    if (submitRes.success) {
      classStudents = submitRes.data;
      localStorage.setItem('students_submit', JSON.stringify(submitRes.data));
    }
  } else {
    const allStudents = JSON.parse(localStorage.getItem('students_submit') || '[]');
    classStudents = allStudents.filter(s => s.classCode === currentClass.code && !s.isTestData);
  }

  const studentListEl = document.getElementById('studentList');
  studentListEl.innerHTML = '';

  if (classStudents.length === 0) {
    studentListEl.innerHTML = '<p class="empty-tip">该班级暂无学生提交</p>';
    return;
  }

  const unique = {};
  classStudents.forEach(s => {
    if (!unique[s.account]) unique[s.account] = s;
  });

  Object.values(unique).forEach(s => {
    const progress = JSON.parse(localStorage.getItem(`student_${s.account}`) || '{"1":false,"2":false,"3":false}');
    const cnt = Object.values(progress).filter(Boolean).length;
    const pct = (cnt / 3) * 100;

    const item = document.createElement('div');
    item.className = 'student-item';
    item.innerHTML = `
      <h4>${s.name || '未知'}（${s.account}）</h4>
      <p>班级：${s.className || '未填写'}</p>
      <p>进度：${cnt}/3题（${pct}%）</p>
      <div class="progress-bar" style="margin:10px 0;">
        <div class="progress-fill" style="width:${pct}%;"></div>
      </div>
      <button onclick="viewStudentCode('${s.account}')">查看代码</button>
    `;
    studentListEl.appendChild(item);
  });
}

// 查看学生代码
function viewStudentCode(studentAccount) {
  const all = JSON.parse(localStorage.getItem('students_submit') || '[]');
  const list = all.filter(s => s.account === studentAccount && !s.isTestData);
  if (!list.length) { alert('暂无提交'); return; }

  let txt = '';
  list.forEach((s, i) => {
    const t = s.createTime instanceof Date ? s.createTime.toLocaleString() : s.createTime || '未知';
    txt += `===== 提交${i+1}（${t}）=====\n`;
    txt += `题目：${s.problemTitle}\n得分：${s.simulationResult?.score||0}\n`;
    txt += '代码：\n' + (s.userCode||'无') + '\n\n';
  });

  document.getElementById('codeViewTitle').textContent = `${list[0].name} 的代码`;
  document.getElementById('codeViewContent').textContent = txt;
  document.getElementById('codeViewModal').style.display = 'flex';
  window.currentViewStudent = studentAccount;
}

// 关闭代码弹窗
function closeCodeModal() {
  document.getElementById('codeViewModal').style.display = 'none';
  window.currentViewStudent = '';
}

// 导出单个学生代码
function exportStudentCode() {
  if (!window.currentViewStudent) return;
  const all = JSON.parse(localStorage.getItem('students_submit') || '[]');
  const list = all.filter(s => s.account === window.currentViewStudent && !s.isTestData);
  if (!list.length) { alert('无可导出内容'); return; }

  let txt = `${list[0].name} 提交记录\n账号：${window.currentViewStudent}\n班级：${list[0].className}\n\n`;
  list.forEach((s, i) => {
    const t = s.createTime instanceof Date ? s.createTime.toLocaleString() : s.createTime;
    txt += `===== ${i+1} ${t} =====\n题目：${s.problemTitle}\n得分：${s.simulationResult?.score||0}\n${s.userCode}\n\n`;
  });

  const blob = new Blob([txt], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${list[0].name}_代码.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// 导出班级Excel
function exportClassData() {
  if (!currentClassId) { alert('请选班级'); return; }
  const classes = JSON.parse(localStorage.getItem('classes') || '[]');
  const c = classes.find(x => (x.id || x._id) === currentClassId);
  if (!c) return;

  const all = JSON.parse(localStorage.getItem('students_submit') || '[]');
  const list = all.filter(s => s.classCode === c.code && !s.isTestData);
  if (!list.length) { alert('无数据'); return; }

  const data = [['姓名','账号','班级','题目','得分','时间','状态']];
  list.forEach(s => {
    const t = s.createTime instanceof Date ? s.createTime.toLocaleString() : s.createTime;
    const ok = s.simulationResult?.score === 100 ? '完成' : '未完成';
    data.push([s.name||'',s.account||'',s.className||'',s.problemTitle||'',s.simulationResult?.score||0,t,ok]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, c.name);
  XLSX.writeFile(wb, `${c.name}编程数据.xlsx`);
  alert('✅ 导出成功');
}

// 清除测试数据
function clearTestData() {
  if (!confirm('确定清除测试数据？')) return;
  let all = JSON.parse(localStorage.getItem('students_submit') || '[]');
  all = all.filter(s => !s.isTestData);
  localStorage.setItem('students_submit', JSON.stringify(all));
  loadTeacherClasses();
  if (currentClassId) loadStudentsByClass();
  alert('✅ 已清理测试数据');
}

// 云连接测试
if (typeof testCloudConn === 'undefined') {
  window.testCloudConn = function() {
    const cloudStatus = document.getElementById('cloudStatus');
    cloudStatus.innerHTML = '🔌 正在测试云连接...';
    cloudStatus.className = 'default';
    
    setTimeout(async () => {
      try {
        if (window.cloudDb) {
          await cloudDb.collection('classes').limit(1).get();
          cloudStatus.innerHTML = '✅ 云连接正常';
          cloudStatus.className = 'success';
        } else throw new Error('未初始化');
      } catch (e) {
        cloudStatus.innerHTML = `❌ 云连接失败：${e.message}`;
        cloudStatus.className = 'error';
      }
    }, 1000);
  };
}

// ==========================
// 🔥 公告管理（教师发布 + 历史）
// ==========================

// 发布公告
async function publishNotice() {
  const classCode = document.getElementById('noticeClassSelector').value;
  const content = document.getElementById('noticeContent').value.trim();

  if (!classCode) { alert('请选择班级'); return; }
  if (!content) { alert('请输入公告内容'); return; }
  if (!currentTeacher) { alert('请先登录'); return; }

  const classes = JSON.parse(localStorage.getItem('classes') || '[]');
  const cls = classes.find(x => x.code === classCode);
  if (!cls) { alert('班级不存在'); return; }

  const notice = {
    classCode,
    className: cls.name,
    teacherAccount: currentTeacher.account,
    teacherName: currentTeacher.name,
    content,
    createTime: new Date()
  };

  // 本地保存
  const list = JSON.parse(localStorage.getItem('notices') || '[]');
  list.unshift(notice);
  localStorage.setItem('notices', JSON.stringify(list));

  // 云同步
  if (window.cloudDbUtils) {
    try {
      await cloudDbUtils.add('notices', notice);
    } catch (e) {}
  }

  document.getElementById('noticeContent').value = '';
  loadNoticeHistory();
  alert('✅ 公告发布成功，学生端已同步');
}

// 加载班级历史公告
function loadNoticeHistory() {
  const classCode = document.getElementById('noticeClassSelector').value;
  const box = document.getElementById('noticeHistoryList');
  if (!classCode) {
    box.innerHTML = '<p class="empty-tip">请选择班级查看公告</p>';
    return;
  }

  const all = JSON.parse(localStorage.getItem('notices') || '[]');
  const list = all.filter(n => n.classCode === classCode);

  if (list.length === 0) {
    box.innerHTML = '<p class="empty-tip">该班级暂无公告</p>';
    return;
  }

  let html = '';
  list.forEach((n, i) => {
    const time = new Date(n.createTime).toLocaleString();
    html += `
    <div style="border:1px solid #eee; border-radius:8px; padding:12px; margin-bottom:10px;">
      <div style="font-size:13px; color:#666;">第 ${i+1} 条 · ${time}</div>
      <div style="margin:8px 0; line-height:1.6;">${n.content}</div>
      <div style="font-size:12px; color:#999;">发布：${n.teacherName} 老师</div>
    </div>
    `;
  });
  box.innerHTML = html;
}