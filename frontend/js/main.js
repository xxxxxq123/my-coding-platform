function runCode() {
const code = document.getElementById('code').value;
const output = document.getElementById('output');

output.innerHTML = `
<h3>运行结果：</h3>
<pre>${code}</pre>
<p>（目前只是显示代码，下一版会真正执行）</p>
<p>🎉 恭喜你完成了第一步！</p>
`;

// 简单音效（可选）
console.log('代码运行按钮被点击了！代码长度：' + code.length);
}