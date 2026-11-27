#!/usr/bin/env node
/**
 * 环境自检 + 自动补齐
 *   node scripts/check-env.mjs            只检查（缺的东西会尝试自动补）
 *   node scripts/check-env.mjs --build    额外跑一次 npm run build 做冒烟测试
 *   node scripts/check-env.mjs --no-fix   只报告，不自动修改任何东西
 *
 * 退出码：0 = 可以正常启动/构建；1 = 有问题需要人工处理
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const AUTO_FIX = !args.has('--no-fix');
const RUN_BUILD = args.has('--build');

const results = [];
const record = (level, name, detail, fix) => results.push({ level, name, detail, fix });
const ok = (n, d) => record('ok', n, d);
const warn = (n, d, f) => record('warn', n, d, f);
const fail = (n, d, f) => record('fail', n, d, f);

function sh(cmd, opts = {}) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
  } catch (e) {
    return null;
  }
}
function exists(p) { return fs.existsSync(path.join(ROOT, p)); }
function readJson(p) { try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); } catch { return null; } }

/* ---------------- 1. Node / npm ---------------- */
const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor >= 22) ok('Node.js', 'v' + process.versions.node);
else fail('Node.js', 'v' + process.versions.node + '（需要 >= 22，Capacitor 8 要求）', '安装 Node 22 LTS 后重开终端');

const npmV = sh('npm -v');
if (npmV) ok('npm', 'v' + npmV);
else fail('npm', '未找到', '重新安装 Node.js（自带 npm）');

/* ---------------- 2. 项目依赖 ---------------- */
const pkg = readJson('package.json');
if (!pkg) {
  fail('package.json', '缺失', '请在项目根目录运行本脚本');
} else {
  const required = [
    'react', 'react-dom', 'react-scripts', 'antd-mobile',
    'i18next', 'react-i18next', 'i18next-browser-languagedetector',
    '@capacitor/core', '@capacitor/android', '@capacitor/cli',
    '@capacitor-community/sqlite', 'recharts',
  ];
  const missingInPkg = required.filter((d) => !(pkg.dependencies?.[d] || pkg.devDependencies?.[d]));
  if (missingInPkg.length) warn('package.json', '缺少依赖声明：' + missingInPkg.join(', '), 'npm i ' + missingInPkg.join(' '));
  else ok('package.json', required.length + ' 个关键依赖已声明');

  const needInstall = !exists('node_modules') ||
    required.some((d) => !exists(path.join('node_modules', d, 'package.json')));
  if (!needInstall) {
    ok('node_modules', '关键包齐全');
  } else if (AUTO_FIX) {
    console.log('… node_modules 不完整，正在 npm install（可能需要几分钟）');
    const r = sh('npm install 2>&1', { stdio: ['ignore', 'pipe', 'pipe'] });
    if (r !== null && exists(path.join('node_modules', 'react', 'package.json'))) ok('node_modules', '已自动安装完成');
    else fail('node_modules', '自动安装失败', '手动执行 npm install 查看报错');
  } else {
    fail('node_modules', '缺失或不完整', 'npm install');
  }
}

/* ---------------- 3. 配置文件 ---------------- */
if (exists('.npmrc') && fs.readFileSync(path.join(ROOT, '.npmrc'), 'utf8').includes('legacy-peer-deps')) {
  ok('.npmrc', 'legacy-peer-deps 已配置');
} else if (AUTO_FIX) {
  fs.writeFileSync(path.join(ROOT, '.npmrc'), 'legacy-peer-deps=true\n', 'utf8');
  ok('.npmrc', '已自动创建（解决 CRA5 与 i18next 的 peer 冲突）');
} else {
  fail('.npmrc', '缺失', '新建 .npmrc 并写入 legacy-peer-deps=true');
}

const envPath = path.join(ROOT, '.env.local');
const envText = exists('.env.local') ? fs.readFileSync(envPath, 'utf8') : '';
if (/REACT_APP_LLM_API_KEY=\S+/.test(envText)) {
  ok('.env.local', 'LLM API Key 已配置（已脱敏）');
} else if (AUTO_FIX) {
  const tpl = '# 请把 sk-xxxx 换成你自己的 DeepSeek Key\n' +
    'REACT_APP_LLM_BASE_URL=https://api.deepseek.com\n' +
    'REACT_APP_LLM_MODEL=deepseek-chat\n' +
    'REACT_APP_LLM_API_KEY=\n';
  if (!exists('.env.local')) fs.writeFileSync(envPath, tpl, 'utf8');
  warn('.env.local', '没有 API Key —— AI 建议会提示"未配置"，其他功能正常', '在 .env.local 里填 REACT_APP_LLM_API_KEY');
} else {
  warn('.env.local', '缺失或没有 Key', '新建 .env.local 并填 REACT_APP_LLM_API_KEY');
}

const capText = exists('capacitor.config.ts') ? fs.readFileSync(path.join(ROOT, 'capacitor.config.ts'), 'utf8') : '';
if (capText.includes("webDir: 'build'")) ok('capacitor.config.ts', "webDir = 'build'");
else warn('capacitor.config.ts', 'webDir 不是 build', '改成 webDir: \'build\'');

/* ---------------- 4. JDK ---------------- */
const javaHome = process.env.JAVA_HOME;
// 优先用 JAVA_HOME 指向的 java：PATH 里可能还留着旧版本（很常见）
let javaMajor = null;
let javaSrc = '';
const homeJava = javaHome ? path.join(javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java') : null;
if (homeJava && fs.existsSync(homeJava)) {
  const out = sh('"' + homeJava + '" -version 2>&1');
  javaMajor = out ? Number((out.match(/version "(\d+)/) || [])[1]) : null;
  javaSrc = 'JAVA_HOME';
}
if (!javaMajor) {
  const out = sh('java -version 2>&1');
  javaMajor = out ? Number((out.match(/version "(\d+)/) || [])[1]) : null;
  javaSrc = 'PATH';
}

if (javaMajor >= 21) ok('JDK', 'java ' + javaMajor + '（来自 ' + javaSrc + '）');
else if (javaMajor >= 17) warn('JDK', 'java ' + javaMajor + '（来自 ' + javaSrc + '）—— 能跑网页，但构建 APK 会失败', '必须装 JDK 21：Capacitor 8 用 Java 21 源码级别编译');
else if (javaMajor) fail('JDK', 'java ' + javaMajor + '（来自 ' + javaSrc + '，需要 21）', '安装 JDK 21 并把 JAVA_HOME 指向它');
else fail('JDK', '未找到 java', '安装 JDK 21 并配置 JAVA_HOME');

const gpText = exists('android/gradle.properties') ? fs.readFileSync(path.join(ROOT, 'android/gradle.properties'), 'utf8') : '';
const pinned = gpText.match(/org\.gradle\.java\.home=(.+)/);
if (pinned) ok('gradle.properties', '已锁定 JDK：' + pinned[1].trim());
else warn('gradle.properties', '未锁定 org.gradle.java.home', '加一行 org.gradle.java.home=D:/你的jdk21');

/* ---------------- 5. Android SDK ---------------- */
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
if (sdk && fs.existsSync(sdk)) {
  ok('ANDROID_HOME', sdk);
  const hasPlatform = fs.existsSync(path.join(sdk, 'platforms', 'android-36'));
  const hasTools = fs.existsSync(path.join(sdk, 'build-tools', '36.0.0'));
  if (hasPlatform && hasTools) ok('Android SDK', 'android-36 + build-tools 36.0.0 已安装');
  else warn('Android SDK', (hasPlatform ? '' : '缺 android-36 ') + (hasTools ? '' : '缺 build-tools 36.0.0'), 'sdkmanager "platforms;android-36" "build-tools;36.0.0"');
  const adb = sh('adb version');
  if (adb) ok('adb', adb.split('\n')[0]);
  else warn('adb', '未在 PATH 中', '把 platform-tools 加进 PATH');
} else {
  fail('ANDROID_HOME', '未设置或路径不存在', '设置 ANDROID_HOME 指向 Android SDK 目录');
}

if (exists('android/gradlew.bat') || exists('android/gradlew')) ok('Gradle Wrapper', 'android/gradlew 存在');
else fail('Gradle Wrapper', '缺失', '重新执行 npx cap add android');

/* ---------------- 6. 可选：构建冒烟 ---------------- */
if (RUN_BUILD) {
  console.log('… 正在执行 npm run build（约 30-60 秒）');
  const out = sh('npm run build 2>&1');
  if (out !== null && exists('build/index.html')) ok('构建冒烟', 'npm run build 成功，产物 build/index.html 存在');
  else fail('构建冒烟', 'npm run build 失败', '查看上面的报错，或运行 npm run build 单独排查');
}

/* ---------------- 输出 ---------------- */
const icon = { ok: '✔', warn: '!', fail: '✖' };
console.log('\n===== 环境自检 =====');
for (const r of results) {
  console.log(`${icon[r.level]} [${r.level.toUpperCase().padEnd(4)}] ${r.name}: ${r.detail}`);
  if (r.fix && r.level !== 'ok') console.log('         → ' + r.fix);
}

const fails = results.filter((r) => r.level === 'fail').length;
const warns = results.filter((r) => r.level === 'warn').length;
console.log('\n===== 结论 =====');
console.log(fails === 0 ? '✔ 可以启动项目：npm start' : '✖ 有 ' + fails + ' 项阻塞问题，按上面的 → 处理');
console.log(fails === 0 ? '✔ 可以构建 APK：npm run build && npx cap sync android && cd android && gradlew assembleDebug' : '');
if (warns) console.log('（另有 ' + warns + ' 项警告，不影响启动）');
process.exit(fails === 0 ? 0 : 1);
