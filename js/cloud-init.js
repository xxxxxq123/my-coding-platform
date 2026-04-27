// 云开发核心配置（替换为你的实际配置）
const CLOUD_CONFIG = {
  appid: 'wxc69fc8c8b31a6762',      // 小程序AppID
  env: 'cloudbase-3gxa8ryt73ad828a' // 云开发环境ID
};

// 全局变量 - 数据库引用和云实例
window.cloudDb = null;
window.cloudInstance = null;

/**
 * 更新云连接状态显示
 * @param {string} type 状态类型：success/error/default
 * @param {string} message 提示信息
 */
function updateCloudStatus(type, message) {
  const statusEl = document.getElementById('cloudStatus');
  if (statusEl) {
    statusEl.className = `cloud-status ${type}`;
    statusEl.innerHTML = message;
  }
  // 控制台同步输出
  const logFn = type === 'success' ? console.log : console.error;
  logFn(`[云开发状态] ${message}`);
}

/**
 * 初始化云开发环境
 * @returns {Promise} 初始化结果Promise
 */
function initCloudBase() {
  // 初始化状态提示
  updateCloudStatus('default', '🔄 正在初始化云开发环境...');

  try {
    // 1. 检查SDK是否加载
    if (typeof window.cloud === 'undefined' || !window.cloud) {
      throw new Error('云开发SDK未加载，请检查引入链接是否正确');
    }

    // 2. 验证配置完整性
    if (!CLOUD_CONFIG.appid || !CLOUD_CONFIG.env) {
      throw new Error('AppID或环境ID配置为空，请检查配置信息');
    }

    // 3. 创建云实例（兼容网页端云开发SDK）
    window.cloudInstance = new window.cloud.Cloud({
      identityless: true, // 开启匿名登录（测试/网页端必备）
      resourceAppid: CLOUD_CONFIG.appid,
      resourceEnv: CLOUD_CONFIG.env
    });

    // 4. 初始化云实例
    return window.cloudInstance.init()
      .then(() => {
        // 5. 获取数据库引用并挂载到全局
        window.cloudDb = window.cloudInstance.database();
        updateCloudStatus('success', `✅ 云开发初始化成功！环境ID：${CLOUD_CONFIG.env}`);
        return Promise.resolve(window.cloudDb);
      })
      .catch(initErr => {
        throw new Error(`初始化失败：${initErr.message || initErr}`);
      });

  } catch (error) {
    updateCloudStatus('error', `❌ 云开发连接失败：${error.message}`);
    return Promise.reject(error);
  }
}

/**
 * 云数据库通用操作工具类（封装增删改查）
 */
const cloudDbUtils = {
  /**
   * 新增数据到指定集合
   * @param {string} collectionName 集合名称
   * @param {object} data 要新增的数据
   * @returns {Promise<{success: boolean, id?: string, data?: object, error?: string}>}
   */
  async add(collectionName, data) {
    if (!window.cloudDb) {
      const errMsg = '云数据库未初始化，请先调用initCloudBase()';
      updateCloudStatus('error', `❌ ${errMsg}`);
      return { success: false, error: errMsg };
    }
    try {
      const res = await window.cloudDb.collection(collectionName).add({ data });
      console.log(`✅ 新增${collectionName}数据成功，ID：`, res.id);
      return { success: true, id: res.id, data };
    } catch (error) {
      const errMsg = error.message || '新增数据失败';
      console.error(`❌ 新增${collectionName}数据失败：`, error);
      return { success: false, error: errMsg };
    }
  },

  /**
   * 根据条件查询集合数据
   * @param {string} collectionName 集合名称
   * @param {object} where 查询条件（默认空）
   * @returns {Promise<{success: boolean, data?: array, error?: string}>}
   */
  async query(collectionName, where = {}) {
    if (!window.cloudDb) {
      const errMsg = '云数据库未初始化，请先调用initCloudBase()';
      updateCloudStatus('error', `❌ ${errMsg}`);
      return { success: false, error: errMsg };
    }
    try {
      const res = await window.cloudDb.collection(collectionName).where(where).get();
      console.log(`✅ 查询${collectionName}数据成功，共${res.data.length}条`);
      return { success: true, data: res.data };
    } catch (error) {
      const errMsg = error.message || '查询数据失败';
      console.error(`❌ 查询${collectionName}数据失败：`, error);
      return { success: false, error: errMsg };
    }
  },

  /**
   * 更新指定ID的数据
   * @param {string} collectionName 集合名称
   * @param {string} docId 文档ID
   * @param {object} data 要更新的数据
   * @returns {Promise<{success: boolean, updated?: number, error?: string}>}
   */
  async update(collectionName, docId, data) {
    if (!window.cloudDb) {
      const errMsg = '云数据库未初始化，请先调用initCloudBase()';
      updateCloudStatus('error', `❌ ${errMsg}`);
      return { success: false, error: errMsg };
    }
    try {
      const res = await window.cloudDb.collection(collectionName).doc(docId).update({ data });
      console.log(`✅ 更新${collectionName}数据成功，更新条数：`, res.stats.updated);
      return { success: true, updated: res.stats.updated };
    } catch (error) {
      const errMsg = error.message || '更新数据失败';
      console.error(`❌ 更新${collectionName}数据失败：`, error);
      return { success: false, error: errMsg };
    }
  },

  /**
   * 删除指定ID的数据
   * @param {string} collectionName 集合名称
   * @param {string} docId 文档ID
   * @returns {Promise<{success: boolean, deleted?: number, error?: string}>}
   */
  async delete(collectionName, docId) {
    if (!window.cloudDb) {
      const errMsg = '云数据库未初始化，请先调用initCloudBase()';
      updateCloudStatus('error', `❌ ${errMsg}`);
      return { success: false, error: errMsg };
    }
    try {
      const res = await window.cloudDb.collection(collectionName).doc(docId).remove();
      console.log(`✅ 删除${collectionName}数据成功，删除条数：`, res.stats.deleted);
      return { success: true, deleted: res.stats.deleted };
    } catch (error) {
      const errMsg = error.message || '删除数据失败';
      console.error(`❌ 删除${collectionName}数据失败：`, error);
      return { success: false, error: errMsg };
    }
  }
};

/**
 * 测试云连接（含数据库访问测试）
 */
function testCloudConn() {
  initCloudBase()
    .then(() => {
      // 测试数据库基础连接（兼容集合未创建的场景）
      return window.cloudDb.collection('students').get()
        .then(() => {
          updateCloudStatus('success', '✅ 云连接测试成功！数据库访问正常');
        })
        .catch(dbErr => {
          const errMsg = dbErr.errMsg || dbErr.message;
          if (errMsg.includes('collection not exists')) {
            updateCloudStatus('success', '✅ 云连接测试成功（students集合暂未创建，属于正常现象）');
          } else {
            updateCloudStatus('error', `❌ 数据库测试失败：${errMsg}`);
          }
        });
    })
    .catch(testErr => {
      updateCloudStatus('error', `❌ 云连接测试失败：${testErr.message}`);
    });
}

// 页面加载完成后初始化状态提示
document.addEventListener('DOMContentLoaded', () => {
  updateCloudStatus('default', '<i class="ri-loader-2-line"></i>未测试连接，点击下方按钮开始测试');
  
  // 自动初始化云环境（可选，也可手动调用）
  initCloudBase().catch(err => {
    console.warn('自动初始化云环境失败（可手动点击测试按钮）：', err);
  });
});

// 暴露全局方法供其他JS文件调用
window.initCloudBase = initCloudBase;
window.testCloudConn = testCloudConn;
window.cloudDbUtils = cloudDbUtils;
window.updateCloudStatus = updateCloudStatus;



/**
 * 调用executeCpp云函数编译运行C++代码
 * @param {string} code 要执行的C++代码
 * @returns {Promise<{success: boolean, result?: object, error?: string}>}
 */
window.callCppFunction = async (code) => {
  // 1. 检查云实例是否初始化
  if (!window.cloudInstance) {
    const errMsg = '云实例未初始化，请先点击「测试云连接」';
    updateCloudStatus('error', `❌ ${errMsg}`);
    return { success: false, error: errMsg };
  }

  // 2. 检查代码是否为空
  if (!code || code.trim() === '') {
    const errMsg = 'C++代码不能为空，请输入代码后重试';
    updateCloudStatus('error', `❌ ${errMsg}`);
    return { success: false, error: errMsg };
  }

  try {
    // 3. 调用云函数（核心：用cloudInstance.callFunction，不是wx.cloud.callFunction）
    updateCloudStatus('default', '🔄 正在编译运行C++代码...');
    const res = await window.cloudInstance.callFunction({
      name: 'executeCpp', // 云函数名称
      data: { code: code } // 传递C++代码
    });

    // 4. 处理返回结果
    if (res.result) {
      const result = res.result;
      // 根据云函数返回码更新状态
      if (result.code === 0) {
        updateCloudStatus('success', '✅ C++代码编译运行成功！');
      } else if (result.code === 1) {
        updateCloudStatus('error', '❌ C++代码编译失败');
      } else if (result.code === 2) {
        updateCloudStatus('error', '❌ C++代码运行失败');
      } else {
        updateCloudStatus('error', '❌ 云函数执行异常');
      }
      return { success: true, result: result };
    } else {
      throw new Error('云函数返回结果为空');
    }
  } catch (error) {
    const errMsg = error.message || '调用executeCpp云函数失败';
    updateCloudStatus('error', `❌ ${errMsg}`);
    console.error('云函数调用失败详情：', error);
    return { success: false, error: errMsg };
  }
};

// 暴露到全局，供其他JS调用
window.callCppFunction = callCppFunction;