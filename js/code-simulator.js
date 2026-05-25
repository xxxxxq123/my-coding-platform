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
   * 步骤1：初始化5道新题目
   */
  initProblems() {
    this.problems = [
      {
        id: 1,
        title: "输出Hello",
        type: "simple-output",
        difficulty: 1,
        tags: ["基础输出", "cout语句"],
        codeTemplate: `#include <iostream>
using namespace std;

int main() {
  // 请在这里编写代码输出 Hello
  return 0;
}`,
        expectedOutput: "Hello",
        referenceCode: `#include <iostream>
using namespace std;

int main() {
  cout << "Hello";
  return 0;
}`
      },
      {
        id: 2,
        title: "两数之和",
        type: "calculation",
        difficulty: 2,
        tags: ["变量定义", "数学运算", "结果输出"],
        codeTemplate: `#include <iostream>
using namespace std;

int main() {
  // 计算10+20的结果并输出
  int a = 10;
  int b = 20;
  return 0;
}`,
        expectedOutput: "30",
        referenceCode: `#include <iostream>
using namespace std;

int main() {
  int a = 10;
  int b = 20;
  cout << a + b;
  return 0;
}`
      },
      {
        id: 3,
        title: "判断奇偶",
        type: "judge-odd-even",
        difficulty: 2,
        tags: ["条件判断", "取模运算", "if语句"],
        codeTemplate: `#include <iostream>
using namespace std;

int main() {
  // 判断数字7是奇数还是偶数并输出
  int num = 7;
  return 0;
}`,
        expectedOutput: "奇数",
        referenceCode: `#include <iostream>
using namespace std;

int main() {
  int num = 7;
  if(num % 2 == 0){
    cout << "偶数";
  }else{
    cout << "奇数";
  }
  return 0;
}`
      },
      {
        id: 4,
        title: "1到10求和",
        type: "sum-calc",
        difficulty: 3,
        tags: ["循环结构", "累加运算", "for循环"],
        codeTemplate: `#include <iostream>
using namespace std;

int main() {
  // 计算1+2+...+10的总和并输出
  int sum = 0;
  return 0;
}`,
        expectedOutput: "55",
        referenceCode: `#include <iostream>
using namespace std;

int main() {
  int sum = 0;
  for(int i=1; i<=10; i++){
    sum += i;
  }
  cout << sum;
  return 0;
}`
      },
      {
        id: 5,
        title: "数组最大值",
        type: "array-max",
        difficulty: 3,
        tags: ["数组", "遍历", "最大值查找"],
        codeTemplate: `#include <iostream>
using namespace std;

int main() {
  // 找出数组 [3,7,2,9,1] 中的最大值并输出
  int arr[] = {3,7,2,9,1};
  return 0;
}`,
        expectedOutput: "9",
        referenceCode: `#include <iostream>
using namespace std;

int main() {
  int arr[] = {3,7,2,9,1};
  int max = arr[0];
  for(int i=1; i<5; i++){
    if(arr[i] > max){
      max = arr[i];
    }
  }
  cout << max;
  return 0;
}`
      }
    ];
  }

  /**
   * 根据题目ID获取题目信息
   */
  getProblemById(problemId) {
    const id = parseInt(problemId);
    return this.problems.find(p => p.id === id) || null;
  }

  /**
   * 代码语法分析
   */
  analyzeCode(code) {
    const result = {
      errors: [],
      warnings: [],
      isSyntaxValid: true
    };

    if (!code.includes("#include <iostream>") && !code.includes("#include \"iostream\"")) {
      result.errors.push("缺少必要头文件：iostream（C++输出功能依赖）");
      result.isSyntaxValid = false;
    }

    if (!code.match(/int\s+main\s*\(/)) {
      result.errors.push("缺少main函数：程序必须有且仅有一个main函数作为入口");
      result.isSyntaxValid = false;
    }

    if (code.includes("system(")) {
      result.errors.push("检测到危险代码：system()调用可能导致安全风险，禁止使用");
      result.isSyntaxValid = false;
    }

    if (!code.includes("cout") && !code.includes("printf")) {
      result.errors.push("缺少输出语句：cout/printf，无法生成执行结果");
      result.isSyntaxValid = false;
    }

    if (!code.includes("return 0;") && result.isSyntaxValid) {
      result.warnings.push("建议在main函数末尾添加return 0;（C++程序规范）");
    }

    if (code.includes("cout") && !code.includes("using namespace std;") && result.isSyntaxValid) {
      result.warnings.push("使用cout但未声明using namespace std;，可能导致编译错误");
    }

    return result;
  }

  /**
   * 模拟执行 + 5道题判题逻辑
   */
  simulateExecution(code, problemId) {
    const analysisResult = this.analyzeCode(code);
    if (!analysisResult.isSyntaxValid) {
      return this.generateFailedReport(analysisResult, problemId);
    }

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
        expectedOutput: ""
      };
    }

    let actualOutput = "";
    let isCorrect = false;
    let feedback = "";

    switch (targetProblem.type) {
      // 1. 输出Hello
      case "simple-output": {
        const expected = targetProblem.expectedOutput;
        const outputRegex = new RegExp(`cout\\s*<<\\s*["']\\s*(${expected})\\s*["']`);
        if (code.match(outputRegex)) {
          actualOutput = expected;
          isCorrect = true;
          feedback = "输出内容完全匹配预期！";
        } else {
          actualOutput = "未检测到正确输出";
          isCorrect = false;
          feedback = `请输出"${expected}"`;
        }
        break;
      }

      // 2. 两数之和 10+20=30
      case "calculation": {
        const expected = targetProblem.expectedOutput;
        if (code.includes("10+20") || code.includes("20+10") || code.includes("a+b") || code.includes("b+a")) {
          actualOutput = "30";
        } else {
          const numMatch = code.match(/cout\s*<<\s*(\d+)/);
          actualOutput = numMatch ? numMatch[1] : "输出错误";
        }
        isCorrect = actualOutput === expected;
        feedback = isCorrect ? "计算结果正确！" : `预期${expected}，实际${actualOutput}`;
        break;
      }

      // 3. 判断奇偶（7是奇数）
      case "judge-odd-even": {
        const expected = targetProblem.expectedOutput;
        if (code.includes("奇数") || (code.includes("num%2!=0") && code.includes("cout"))) {
          actualOutput = "奇数";
        } else if (code.includes("偶数")) {
          actualOutput = "偶数";
        } else {
          actualOutput = "未检测到判断结果";
        }
        isCorrect = actualOutput === expected;
        feedback = isCorrect ? "判断正确！7是奇数" : "判断错误，请检查取模运算";
        break;
      }

      // 4. 1到10求和=55
      case "sum-calc": {
        const expected = targetProblem.expectedOutput;
        if (code.includes("for(int i=1; i<=10") || code.includes("sum+=i")) {
          actualOutput = "55";
        } else {
          const numMatch = code.match(/cout\s*<<\s*(\d+)/);
          actualOutput = numMatch ? numMatch[1] : "计算错误";
        }
        isCorrect = actualOutput === expected;
        feedback = isCorrect ? "求和正确！1-10总和为55" : `预期55，实际${actualOutput}`;
        break;
      }

      // 5. 数组最大值=9
      case "array-max": {
        const expected = targetProblem.expectedOutput;
        if (code.includes("arr[") && code.includes("max")) {
          actualOutput = "9";
        } else {
          const numMatch = code.match(/cout\s*<<\s*(\d+)/);
          actualOutput = numMatch ? numMatch[1] : "未找到最大值";
        }
        isCorrect = actualOutput === expected;
        feedback = isCorrect ? "正确！数组最大值是9" : `预期9，实际${actualOutput}`;
        break;
      }

      default: {
        actualOutput = "无法识别题目类型";
        isCorrect = false;
        feedback = "代码检查通过，请运行验证";
      }
    }

    return {
      success: true,
      output: actualOutput,
      expectedOutput: targetProblem.expectedOutput,
      score: isCorrect ? 100 : 0,
      execTime: this.simulationConfig.defaultExecTime,
      memoryUsed: this.simulationConfig.defaultMemory,
      errors: analysisResult.errors,
      warnings: analysisResult.warnings,
      feedback: feedback
    };
  }

  /**
   * 生成失败报告
   */
  generateFailedReport(analysisResult, problemId) {
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
   * 生成详细报告
   */
  generateDetailedReport(code, problemId) {
    const result = this.simulateExecution(code, problemId);
    const targetProblem = this.getProblemById(problemId);

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

    if (result.errors.length > 0) {
      report += `
错误列表：
${result.errors.map((err, idx) => `  ${idx+1}. ${err}`).join('\n')}`;
    }

    if (result.warnings.length > 0) {
      report += `
警告列表：
${result.warnings.map((warn, idx) => `  ${idx+1}. ${warn}`).join('\n')}`;
    }

    report += `
====================================================`;
    return report;
  }

  // 获取所有题目
  getAllProblems() {
    return [...this.problems];
  }
}

// ------------------- 测试示例（5道新题 完整测试） -------------------
const simulator = new CodeSimulator();

// 测试1：输出Hello
const test1 = `#include <iostream>
using namespace std;
int main() {
  cout << "Hello";
  return 0;
}`;
console.log("=== 题目1：输出Hello ===");
console.log(simulator.generateDetailedReport(test1, 1));

// 测试2：两数之和
const test2 = `#include <iostream>
using namespace std;
int main() {
  int a=10,b=20; cout << a+b;
  return 0;
}`;
console.log("\n=== 题目2：两数之和 ===");
console.log(simulator.generateDetailedReport(test2, 2));

// 测试3：判断奇偶
const test3 = `#include <iostream>
using namespace std;
int main() {
  int num=7;
  if(num%2!=0) cout << "奇数";
  return 0;
}`;
console.log("\n=== 题目3：判断奇偶 ===");
console.log(simulator.generateDetailedReport(test3, 3));

// 测试4：1到10求和
const test4 = `#include <iostream>
using namespace std;
int main() {
  int sum = 0;
  for(int i=1; i<=10; i++){
    sum += i;
  }
  cout << sum;
  return 0;
}`;
console.log("\n=== 题目4：1到10求和 ===");
console.log(simulator.generateDetailedReport(test4, 4));

// 测试5：数组最大值
const test5 = `#include <iostream>
using namespace std;
int main() {
  int arr[] = {3,7,2,9,1};
  int max = arr[0];
  for(int i=1; i<5; i++){
    if(arr[i] > max){
      max = arr[i];
    }
  }
  cout << max;
  return 0;
}`;
console.log("\n=== 题目5：数组最大值 ===");
console.log(simulator.generateDetailedReport(test5, 5));

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CodeSimulator;
}
if (typeof window !== 'undefined') {
  window.CodeSimulator = CodeSimulator;
  window.codeSimulator = new CodeSimulator();
}