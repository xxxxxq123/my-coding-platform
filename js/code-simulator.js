class CodeSimulator {
  constructor() {
    // 存储预设题目
    this.problems = [];
    // 初始化预设题目
    this.initProblems();
    // 模拟执行的基础配置
    this.simulationConfig = {
      defaultExecTime: 0.05, // 默认模拟执行时间（秒）
      defaultMemory: 4096    // 默认模拟内存占用（KB）
    };
  }

  /**
   * 步骤1：初始化预设题目（新增难度、知识点标签、参考代码）
   */
  initProblems() {
    this.problems = [
      {
        id: 1,
        title: "输出\"Hello World\"",
        type: "simple-output", // 简单输出类题目
        difficulty: 1, // 1星简单
        tags: ["基础输出", "cout语句"],
        codeTemplate: `#include <iostream>
using namespace std;

int main() {
  // 请在这里编写代码输出 Hello World
  return 0;
}`,
        expectedOutput: "Hello World",
        referenceCode: `#include <iostream>
using namespace std;

int main() {
  cout << "Hello World";
  return 0;
}`
      },
      {
        id: 2,
        title: "计算1+2的结果并输出",
        type: "calculation", // 计算类题目
        difficulty: 2, // 2星中等
        tags: ["变量定义", "数学运算", "结果输出"],
        codeTemplate: `#include <iostream>
using namespace std;

int main() {
  // 请编写代码计算1+2并输出结果
  int a = 1;
  int b = 2;
  // 补充代码
  return 0;
}`,
        expectedOutput: "3",
        referenceCode: `#include <iostream>
using namespace std;

int main() {
  int a = 1;
  int b = 2;
  cout << a + b;
  return 0;
}`
      },
      {
        id: 3,
        title: "用循环输出5个星号（一行）",
        type: "loop-output", // 循环输出类题目
        difficulty: 3, //3星困难
        tags: ["for循环", "循环结构", "批量输出"],
        codeTemplate: `#include <iostream>
using namespace std;

int main() {
  // 请用循环输出5个星号（一行显示）
  return 0;
}`,
        expectedOutput: "*****",
        referenceCode: `#include <iostream>
using namespace std;

int main() {
  for(int i=0; i<5; i++){
    cout << "*";
  }
  return 0;
}`
      }
    ];
  }

  /**
   * 根据题目ID获取题目信息
   * @param {number|string} problemId 题目ID（兼容字符串/数字类型）
   * @returns {object|null} 题目信息对象 / null（未找到）
   */
  getProblemById(problemId) {
    // 统一转为数字类型，避免类型不匹配
    const id = parseInt(problemId);
    return this.problems.find(p => p.id === id) || null;
  }

  /**
   * 步骤1/2：代码分析方法（analyzeCode）
   * @param {string} code - 学生输入的代码字符串
   * @returns {object} 分析结果：错误列表、警告列表、是否通过语法检查
   */
  analyzeCode(code) {
    const result = {
      errors: [],        // 致命错误（语法不通过）
      warnings: [],      // 警告（不影响执行但不规范）
      isSyntaxValid: true // 语法检查是否通过
    };

    // 规则1：检查必要头文件（C++ 输出必备）
    if (!code.includes("#include <iostream>") && !code.includes("#include \"iostream\"")) {
      result.errors.push("缺少必要头文件：iostream（C++输出功能依赖）");
      result.isSyntaxValid = false;
    }

    // 规则2：检查main函数（程序入口）
    if (!code.match(/int\s+main\s*\(/)) {
      result.errors.push("缺少main函数：程序必须有且仅有一个main函数作为入口");
      result.isSyntaxValid = false;
    }

    // 规则3：检查危险代码
    if (code.includes("system(")) {
      result.errors.push("检测到危险代码：system()调用可能导致安全风险，禁止使用");
      result.isSyntaxValid = false;
    }

    // 规则4：检查输出语句
    if (!code.includes("cout") && !code.includes("printf")) {
      result.errors.push("缺少输出语句：cout/printf，无法生成执行结果");
      result.isSyntaxValid = false;
    }

    // 警告规则1：检查是否有return 0（规范问题）
    if (!code.includes("return 0;") && result.isSyntaxValid) {
      result.warnings.push("建议在main函数末尾添加return 0;（C++程序规范）");
    }

    // 警告规则2：检查是否使用using namespace std;（cout依赖）
    if (code.includes("cout") && !code.includes("using namespace std;") && result.isSyntaxValid) {
      result.warnings.push("使用cout但未声明using namespace std;，可能导致编译错误");
    }

    return result;
  }

  /**
   * 步骤2：模拟执行方法（simulateExecution）
   * @param {string} code - 学生代码
   * @param {number} problemId - 题目ID
   * @returns {object} 模拟执行结果（含输出、得分、执行信息等）
   */
  simulateExecution(code, problemId) {
    // 1. 先执行语法分析
    const analysisResult = this.analyzeCode(code);
    if (!analysisResult.isSyntaxValid) {
      return this.generateFailedReport(analysisResult, problemId);
    }

    // 2. 根据题目ID查找预设题目（使用新增的getProblemById方法）
    const targetProblem = this.getProblemById(problemId);
    if (!targetProblem) {
      return {
        success: false,
        output: "",
        score: 0,
        execTime: 0,
        memoryUsed: 0,
        errors: [`未找到ID为${problemId}的题目`],
        warnings: [],
        feedback: "",
        expectedOutput: "" // 补充前端需要的字段
      };
    }

    // 3. 根据题目类型执行差异化验证逻辑
    let actualOutput = "";
    let isCorrect = false;
    let feedback = "";

    switch (targetProblem.type) {
      // 3.1 简单输出类题目：检查是否包含预期输出内容
      case "simple-output": {
        const expected = targetProblem.expectedOutput;
        // 匹配cout << "xxx" 或 cout << 'xxx' 格式（兼容空格）
        const outputRegex = new RegExp(`cout\\s*<<\\s*["']\\s*(${expected})\\s*["']`);
        if (code.match(outputRegex)) {
          actualOutput = expected;
          isCorrect = true;
          feedback = "输出内容完全匹配预期！";
        } else {
          actualOutput = "未知输出（未检测到预期的输出内容）";
          isCorrect = false;
          feedback = `未检测到输出"${expected}"的语句，请检查输出内容是否正确`;
        }
        break;
      }

      // 3.2 计算类题目：检查输出值是否匹配
      case "calculation": {
        const expected = targetProblem.expectedOutput;
        // 匹配输出数字的场景（cout << 数字 / cout << 变量）
        const numRegex = /cout\s*<<\s*(\d+|[\w]+)/;
        const match = code.match(numRegex);
        if (match) {
          // 如果是直接输出数字
          if (!isNaN(Number(match[1]))) {
            actualOutput = match[1];
          } else {
            // 如果是输出变量，模拟计算结果（针对1+2场景）
            if (code.includes("1 + 2") || code.includes("2 + 1") || code.includes("a + b") || code.includes("b + a") || code.includes("c = a + b") || code.includes("c = b + a")) {
              actualOutput = "3";
            } else {
              actualOutput = "无法识别的变量输出";
            }
          }
        } else {
          actualOutput = "未检测到数值输出";
        }

        isCorrect = actualOutput === expected;
        feedback = isCorrect 
          ? "计算结果正确，输出值匹配预期！" 
          : `计算结果错误：预期输出${expected}，实际输出${actualOutput}`;
        break;
      }

      // 3.3 循环输出类题目：检查循环次数和输出内容
      case "loop-output": {
        const expected = targetProblem.expectedOutput;
        const starCount = expected.length;
        // 匹配for循环（for(int i=0; i<N; i++)）
        const loopRegex = /for\s*\([^;]+;\s*i\s*<\s*(\d+)\s*;/;
        const loopMatch = code.match(loopRegex);
        // 匹配输出星号的语句
        const starOutputRegex = /cout\s*<<\s*['*"]/;

        if (loopMatch && starOutputRegex.test(code)) {
          const loopNum = parseInt(loopMatch[1]);
          actualOutput = "*".repeat(loopNum);
          isCorrect = actualOutput === expected;
          feedback = isCorrect 
            ? `循环输出${starCount}个星号，结果正确！` 
            : `循环次数错误：预期${starCount}次，实际${loopNum}次`;
        } else {
          actualOutput = "未检测到有效循环输出";
          isCorrect = false;
          feedback = "未找到循环输出星号的逻辑，请检查循环条件和输出语句";
        }
        break;
      }

      // 未知题目类型
      default: {
        actualOutput = "无法识别题目类型";
        isCorrect = false;
        feedback = "代码看起来正确，需要实际运行验证";
      }
    }

    // 4. 生成最终报告（含得分、执行时间/内存）
    return {
      success: true,
      output: actualOutput,
      expectedOutput: targetProblem.expectedOutput,
      score: isCorrect ? 100 : 0, // 正确得100分，错误得0分
      execTime: this.simulationConfig.defaultExecTime, // 模拟执行时间
      memoryUsed: this.simulationConfig.defaultMemory, // 模拟内存使用
      errors: analysisResult.errors,
      warnings: analysisResult.warnings,
      feedback: feedback
    };
  }

  /**
   * 生成执行失败的报告（语法检查不通过时）
   * @param {object} analysisResult - 语法分析结果
   * @param {number} problemId - 题目ID
   * @returns {object} 失败报告
   */
  generateFailedReport(analysisResult, problemId) {
    // 兼容未找到题目的场景
    const targetProblem = this.getProblemById(problemId);
    return {
      success: false,
      output: "",
      expectedOutput: targetProblem?.expectedOutput || "",
      score: 0,
      execTime: 0,
      memoryUsed: 0,
      errors: analysisResult.errors,
      warnings: analysisResult.warnings,
      feedback: "语法检查未通过，无法执行代码，请先修复错误"
    };
  }

  /**
   * 生成格式化的详细报告（易读版）
   * @param {string} code - 学生代码
   * @param {number} problemId - 题目ID
   * @returns {string} 格式化报告
   */
  generateDetailedReport(code, problemId) {
    const result = this.simulateExecution(code, problemId);
    const targetProblem = this.getProblemById(problemId); // 使用新增方法

    let report = `
==================== 代码模拟执行报告 ====================
题目ID：${problemId}
题目标题：${targetProblem?.title || "未知题目"}
----------------------------------------------------
执行状态：${result.success ? "✅ 成功" : "❌ 失败"}
模拟输出：${result.output || "无"}
预期输出：${result.expectedOutput || "无"}
得分：${result.score}/100
模拟执行时间：${result.execTime.toFixed(4)} 秒
模拟内存使用：${result.memoryUsed} KB
----------------------------------------------------
反馈信息：${result.feedback}
----------------------------------------------------`;

    // 追加错误信息
    if (result.errors.length > 0) {
      report += `
错误列表：
${result.errors.map((err, idx) => `  ${idx+1}. ${err}`).join('\n')}`;
    }

    // 追加警告信息
    if (result.warnings.length > 0) {
      report += `
警告列表：
${result.warnings.map((warn, idx) => `  ${idx+1}. ${warn}`).join('\n')}`;
    }

    report += `
====================================================`;
    return report;
  }

  // 辅助方法：获取所有预设题目列表
  getAllProblems() {
    return [...this.problems];
  }
}

// ------------------- 测试示例 -------------------
// 1. 创建模拟器实例
const simulator = new CodeSimulator();

// 2. 测试题目1：正确的Hello World代码
const correctCode1 = `#include <iostream>
using namespace std;

int main() {
  cout << "Hello World";
  return 0;
}`;
console.log("=== 测试题目1（正确代码）===");
console.log(simulator.generateDetailedReport(correctCode1, 1));

// 3. 测试题目2：错误的计算代码（输出4）
const wrongCode2 = `#include <iostream>
using namespace std;

int main() {
  int a = 1;
  int b = 2;
  cout << 4;
  return 0;
}`;
console.log("\n=== 测试题目2（错误代码）===");
console.log(simulator.generateDetailedReport(wrongCode2, 2));

// 4. 测试题目3：循环输出星号（正确代码）
const correctCode3 = `#include <iostream>
using namespace std;

int main() {
  for(int i=0; i<5; i++) {
    cout << '*';
  }
  return 0;
}`;
console.log("\n=== 测试题目3（正确代码）===");
console.log(simulator.generateDetailedReport(correctCode3, 3));

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CodeSimulator;
}

// 挂载到window全局，供前端页面直接访问
if (typeof window !== 'undefined') {
  window.CodeSimulator = CodeSimulator;
  window.codeSimulator = new CodeSimulator();
}