# BMI 计算器 —— React + Capacitor + Android

一个用 **React（Create React App）** 开发、通过 **Capacitor** 打包成安卓原生 App 的 BMI 计算器。
它按年龄和性别区分判定标准：**成年人**使用香港卫生防护中心（WHO 西太平洋区）的体重指标表，
**儿童与青少年（年龄 ≤ 18）**使用新加坡 HPB 的 **BMI-for-Age（年龄别 BMI）**百分位表。
当结果落在"严重偏瘦 / 严重超重"区间时，界面会切换为专门的警告样式。

---

## 1. 技术栈与版本

| 层次 | 技术 | 版本（实测） |
| --- | --- | --- |
| UI 框架 | React | 18.3.1 |
| 组件库 | antd-mobile | 5.43.0 |
| Web 构建 | react-scripts（Create React App） | 5.0.1 |
| 原生封装 | @capacitor/core / android / cli | 8.6.2 |
| 安卓构建插件 | Android Gradle Plugin | 8.13.0 |
| 构建工具 | Gradle Wrapper | 8.14.3 |
| 应用 ID / 名称 | `com.sytus.bmi` / `BMI` | — |

> antd-mobile v5 **只支持 React 16–18**。在没有阅读第 10.2 节之前，不要把 React 升到 19。

---

## 2. 环境要求

### 2.1 必需的软件

| 工具 | 最低要求 | 实测版本 | 为什么需要 |
| --- | --- | --- | --- |
| Node.js | **≥ 22.0.0** | 22.21.1 | Capacitor 8 强制要求 Node ≥ 22 |
| npm | ≥ 10 | 10.9.4 | 安装依赖 |
| JDK | **17 以上，推荐 21** | Temurin 21.0.12.1+1 | AGP 8.13 / Capacitor 8 以 Java 21 源码级别编译 |
| Android SDK Platform | **36** | android-36 | `compileSdkVersion = 36` |
| Android Build-Tools | **36.0.0** | 36.0.0 | 打包 APK 时使用 |
| adb（platform-tools） | ≥ 35 | 35.0.2 | 安装、调试、截图 |
| Android Studio | 可选 | 2024.2.1 | 只用来管理 AVD 和 SDK，**构建并不需要它** |

**不需要单独安装 Gradle。** 项目自带 `android/gradlew.bat`（Gradle Wrapper 8.14.3），
第一次构建时自动下载对应版本。

**为什么必须是 JDK 21：** `node_modules/@capacitor/android/capacitor/build.gradle` 里写着
`sourceCompatibility = JavaVersion.VERSION_21`。如果用 JDK 18 或更低版本构建，会报：

```
Execution failed for task ':capacitor-android:compileDebugJavaWithJavac'.
> Java compilation initialization error
    错误: 无效的源发行版: 21        <-- GBK 控制台下会显示成乱码
```

---

## 3. 一次性环境搭建（Windows）

### 3.1 Node.js

安装 Node 22 LTS，然后验证：

```powershell
node -v     # v22.x
npm -v      # 10.x
```

### 3.2 安装 JDK 21 并配置 `JAVA_HOME`

```powershell
# 示例：Temurin 21 装在 D:jdk-21.0.12.1+1
[Environment]::SetEnvironmentVariable('JAVA_HOME','D:jdk-21.0.12.1+1','Machine')
```

然后**必须新开一个终端**（环境变量不会影响已经运行的窗口）再验证：

```powershell
echo $env:JAVA_HOME
java -version          # 必须显示 openjdk version 21.x
```

> 如果 `java -version` 仍然显示 Java 8 / 18，说明 PATH 里排在前面的是旧 JDK 的启动器。
> 把旧路径删掉，或把 `%JAVA_HOME%in` 移到最前面。
> Gradle 本身只认 `JAVA_HOME`，但 `keytool`、`npx cap run` 等工具会从 PATH 取 `java`。

**本项目已经把 JDK 写死在 `android/gradle.properties` 里**，所以构建不依赖当前窗口的环境变量：

```properties
org.gradle.java.home=D:/jdk-21.0.12.1+1
```

换了 JDK 目录记得改这一行。注意这里用**正斜杠**。

### 3.3 Android SDK

用 Android Studio 的 SDK Manager 安装，或用命令行：

```powershell
$env:ANDROID_HOME\cmdline-tools\bin\sdkmanager.bat "platforms;android-36" "build-tools;36.0.0" "platform-tools"
$env:ANDROID_HOME\cmdline-tools\bin\sdkmanager.bat --licenses   # 一路 y 接受
```

配置环境变量（Capacitor / Gradle 会读取）：

```powershell
[Environment]::SetEnvironmentVariable('ANDROID_HOME','C:\Users\<你的用户名>\AppData\Local\Android\Sdk','Machine')
[Environment]::SetEnvironmentVariable('ANDROID_SDK_ROOT','C:\Users\<你的用户名>\AppData\Local\Android\Sdk','Machine')
```

验证：

```powershell
adb version      # Android Debug Bridge version 1.0.41 / 35.x
```

### 3.4 验证整套工具链

```powershell
cd android
.\gradlew.bat -version     # JVM 那一行必须显示 21.x
```

---

> 懒人做法：直接运行 `.\scripts\setup-env.ps1`，脚本会把上面 3.1–3.4 的检查全做一遍，缺什么自动补。
> 详见第 14 节。

## 4. 安装项目依赖

```powershell
cd <项目根目录>
npm install
```

---

## 5. 目录结构

```
bmi/
├── public/                 # CRA 的 HTML 外壳和图标
├── src/
│   ├── index.jsx           # 入口：引入 antd-mobile 全局样式，挂载 <App/>
│   ├── App.jsx             # 屏幕切换（Home ↔ Report），保存用户输入
│   ├── utils/
│   │   ├── chartChild.js   # HPB BMI-for-Age 查表数据（男/女，6–18 岁）
│   │   └── rules.js        # calcBMI()、classifyAdult()、classifyChild()、classify()
│   └── views/
│       ├── Home/Home.jsx   # 输入页：身高、体重、年龄、性别 + 校验
│       └── Report/Report.jsx # 结果页：BMI 数值、分级色带、警告样式
├── capacitor.config.ts     # appId、appName、webDir: 'build'
└── android/                # 生成的原生工程（需要提交进 git）
```

`webDir` 指向 `build/`，也就是 CRA 的生产构建输出。**千万不要**把 `webDir` 指到 `src/`。

---

## 6. 开发调试（浏览器）

```powershell
npm start
```

浏览器打开 http://localhost:3000。建议用 Chrome DevTools 的设备模式（375 × 812）模拟手机，
改代码会自动热更新。

---

## 7. 在安卓上运行

**每次改完 React 代码，都必须重新构建 Web 产物并同步到原生工程。**
漏掉第 2 步是"我改了代码但 App 没变"的第一大原因。

```powershell
# 1. 构建 Web 产物 -> build/
npm run build

# 2. 把 build/ 拷进 android/app/src/main/assets/public，并更新插件
npx cap sync android

# 3a. 一条命令完成 构建 + 安装 + 启动
npx cap run android

# 3b. 或者手动出 APK 再安装
cd android
.\gradlew.bat assembleDebug
adb install -r .\app\build\outputs\apk\debug\app-debug.apk
```

产物位置：
- Debug APK：`android/app/build/outputs/apk/debug/app-debug.apk`
- Release APK：`android/app/build/outputs/apk/release/app-release.apk`

### 7.1 真机 / 模拟器

```powershell
adb devices            # 状态必须是 device，不是 unauthorized
npx cap run android --target emulator-5554    # 指定设备
npx cap run android --list                    # 列出可选设备
```

### 7.2 热更新调试（开发界面时强烈推荐）

```powershell
# 终端 1
npm start

# 终端 2
npx cap run android -l
```

要点：

- `-l` / `--live-reload` 会让 WebView 直接加载 `http://<你的局域网IP>:3000`（IP 自动探测）。
- **Capacitor 8 已经删掉了 `--external` 参数**，局域网 IP 现在是默认行为。需要时可用
  `--host <ip>`、`--port <port>`、`--https`、`--forwardPorts 3000:3000`。
- 这条命令会**临时改写** `android/app/src/main/assets/capacitor.config.json`，按一次
  `Ctrl+C` 会复原。如果是强杀进程，文件里会残留 `server.url`，之后 App 会一直白屏。
  解决办法：`npx cap sync android`。
- 安卓默认禁止明文 HTTP。要做热更新，新建
  `android/app/src/debug/AndroidManifest.xml`（只对 debug 生效，不影响正式包）：

  ```xml
  <?xml version="1.0" encoding="utf-8"?>
  <manifest xmlns:android="http://schemas.android.com/apk/res/android">
      <application android:usesCleartextTraffic="true" />
  </manifest>
  ```

---

## 8. 正式签名出包

### 8.1 生成 keystore（一辈子只做一次，务必备份）

```powershell
keytool -genkey -v -keystore bmi-release.keystore -alias bmi -keyalg RSA -keysize 2048 -validity 10000
```

### 8.2 配置签名

新建 `android/keystore.properties`（**不要提交进 git**）：

```properties
storeFile=../../bmi-release.keystore
storePassword=<密码>
keyAlias=bmi
keyPassword=<密码>
```

在 `android/app/build.gradle` 里读取该文件，并增加 `signingConfigs.release` 配置块，
最后在 `buildTypes.release` 中指定 `signingConfig signingConfigs.release`。

### 8.3 构建

```powershell
cd android
.\gradlew.bat assembleRelease    # 签名 APK -> app/build/outputs/apk/release/
.\gradlew.bat bundleRelease      # 签名 AAB -> app/build/outputs/bundle/release/（上架用）
```

每次上架前记得在 `android/app/build.gradle` 里递增 `versionCode` 和 `versionName`。

---

## 9. 命令速查表

| 目的 | 命令 |
| --- | --- |
| 安装依赖 | `npm install` |
| 启动开发服务器 | `npm start` |
| 生产构建 | `npm run build` |
| 同步 Web 产物到安卓 | `npx cap sync android` |
| 只拷贝资源（不更新插件） | `npx cap copy android` |
| 构建 + 安装 + 启动 | `npx cap run android` |
| 热更新调试 | `npx cap run android -l` |
| 用 Android Studio 打开原生工程 | `npx cap open android` |
| 环境自检（Capacitor） | `npx cap doctor` |
| **本机环境体检 + 自动修复** | `.\scripts\setup-env.ps1`（详见第 14 节） |
| 打 Debug APK | `cd android; .\gradlew.bat assembleDebug` |
| 打 Release APK / AAB | `cd android; .\gradlew.bat assembleRelease` / `bundleRelease` |
| 停止 Gradle 守护进程 | `cd android; .\gradlew.bat --stop` |
| 查看已连接设备 | `adb devices` |
| 安装 APK | `adb install -r <apk路径>` |
| 查看 App 日志 | `adb logcat \| Select-String -Pattern "chromium\|Capacitor"` |
| 截屏 | `adb shell screencap -p /sdcard/s.png; adb pull /sdcard/s.png .` |
| 清理构建缓存 | `cd android; .\gradlew.bat clean` |

---

## 10. 常见问题

### 10.1 报 `Java compilation initialization error`（常伴随中文乱码）

说明 Gradle 守护进程用的是低于 21 的 JDK。

```powershell
cd android
.\gradlew.bat --stop
.\gradlew.bat -version      # JVM: 必须是 21.x
```

如果仍然显示 18，检查 `android/gradle.properties` 里的 `org.gradle.java.home`。
想看到英文报错，可以这样跑：

```powershell
.\gradlew.bat assembleDebug --stacktrace -Dorg.gradle.jvmargs="-Xmx1536m -Duser.language=en -Duser.country=US -Dfile.encoding=UTF-8"
```

### 10.2 报 `unmountComponentAtNode is not a function`

React 19 删除了这个 API，而 antd-mobile v5 在关闭 `Toast` / `Dialog` 时仍会调用它。
解决办法是留在 React 18：

```powershell
npm install react@18.3.1 react-dom@18.3.1
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
```

### 10.3 装到手机后白屏

绝大多数是忘了同步：

```powershell
npm run build
npx cap sync android
cd android; .\gradlew.bat assembleDebug
```

如果是在热更新之后出现的，检查 `android/app/src/main/assets/capacitor.config.json`，
把残留的 `"server": { "url": ... }` 删掉（或者直接 `npx cap sync android`）。

### 10.4 报 `error: unknown option '--external'`

Capacitor 8 已移除该参数。改用 `npx cap run android -l`（局域网 IP 已是默认）。

### 10.5 内存不足 / 一堆 Gradle 守护进程

```powershell
cd android
.\gradlew.bat --stop
```

可以在 `android/gradle.properties` 里调整 `org.gradle.jvmargs`（默认 `-Xmx1536m`）。

### 10.6 `npx cap` 提示找不到配置文件

Capacitor 命令必须在**项目根目录**（`capacitor.config.ts` 所在目录）执行，
不能在 `android/` 里执行。

---

## 11. 实测环境（参考机）

| 项目 | 值 |
| --- | --- |
| 操作系统 | Windows 10.0.26100 |
| Node / npm | 22.21.1 / 10.9.4 |
| JAVA_HOME | `D:\jdk-21.0.12.1+1`（Temurin 21.0.12.1+1） |
| ANDROID_HOME | `C:\Users\<用户名>\AppData\Local\Android\Sdk` |
| SDK Platform / Build-Tools | android-36 / 36.0.0 |
| adb | 35.0.2 |
| Gradle 发行版 | 8.14.3（wrapper） |

---

## 12. 参考资料

* **成人表**：`BMI_chart_adult.pdf` —— 香港卫生防护中心，参考 WHO 西太平洋区 2000 年标准。
  分档：< 18.5 偏瘦，18.5–22.9 适中，23–24.9 过重，≥ 25 肥胖。
* **儿童表**：`BMI_chart_child.pdf` —— 新加坡健康促进局（HPB），BMI-for-Age，适用 6–18 岁，
  男女分开，按百分位分 5 档（<3rd、3rd–<5th、5th–<90th、90th–<97th、≥97th）。
* 成人表本身没有定义"严重"档；本项目采用 **< 16** 和 **≥ 30**（WHO 重度消瘦 / 肥胖 II 级）
  作为警告状态的阈值，第 12 节即为此假设的说明。

---

## 13. LLM 健康建议（Task 3）

结果页的「AI 健康建议」卡片会把 **BMI、年龄、性别、身高体重、分级**发给 DeepSeek，
返回 3 句中文/英文建议。语言跟随 App 当前语言。

### 13.1 需要的环境变量

在项目根目录建 `.env.local`（**已被 git 忽略，不要提交**）：

```ini
REACT_APP_LLM_BASE_URL=https://api.deepseek.com
REACT_APP_LLM_MODEL=deepseek-chat
REACT_APP_LLM_API_KEY=sk-你的密钥
```

改完要**重启 dev server**，CRA 只在启动时读取。

### 13.2 为什么有两个"代理"

| 环境 | 走什么 | 文件 |
| --- | --- | --- |
| 浏览器 `npm start` | 本地代理 `/llm/*` → DeepSeek | `src/setupProxy.js` |
| 安卓 APK | 原生 HTTP，不经浏览器 | `capacitor.config.ts` 的 `CapacitorHttp.enabled` |

两个都配好，才能做到「浏览器能跑，手机也能跑」。

### 13.3 安全提醒

`REACT_APP_*` 变量会被 CRA **内联进 JS 包**，所以打出来的 APK 里含有 API Key，
反编译可提取。作业演示没问题；若要公开分享 APK，请先删除 key 重新打包，
或改造成「App 内输入 key」的方案。

### 13.4 相关文件

* `src/services/llm.js` —— 拼 prompt、发请求、超时、错误分类、语言校验与重试
* `src/setupProxy.js` —— 开发期代理
* `src/views/Report/Report.jsx` —— AI 卡片与按钮

---

## 14. 环境自检脚本（`scripts/setup-env.ps1`）

装依赖之前、或者"明明昨天还能跑今天就不行"的时候，先跑这个脚本。

**它不需要 Node 已安装、也不需要项目能编译** —— 用 Windows 自带的 PowerShell 就能运行，
检查的是**整台机器**：Node / npm / JDK / JAVA_HOME / PATH / Android SDK / adb / Git / 项目依赖。

### 14.1 怎么运行

在项目根目录打开 PowerShell，直接跑：

```powershell
cd C:\Users\Sytus\Desktop\BMI\bmi
.\scripts\setup-env.ps1
```

也可以用 npm 包装（等价，好处是自带 `-ExecutionPolicy Bypass`）：

```powershell
npm run setup            # 体检 + 自动修复
npm run setup:build      # 体检 + 再跑一次 npm run build
npm run setup -- -NoFix  # 只看不改
```

### 14.2 参数

| 参数 | 作用 |
| --- | --- |
| （不加） | 体检 + 自动修复缺失项 |
| `-NoFix` | 只报告，不修改任何东西 |
| `-Build` | 体检结束后额外执行 `npm run build` 做冒烟测试 |

| 想看帮助 | `Get-Help .\scripts\setup-env.ps1 -Examples` |

### 14.3 输出怎么读

```
[OK  ] Node.js: v22.21.1                       正常
[FIX ] .npmrc: 已创建 legacy-peer-deps=true     脚本动手修了
[WARN] PATH 里有旧 Java: D:\jdk-18.0.2.1\bin   不阻塞，但建议处理
[FAIL] JDK 21: 未找到                           阻塞，必须处理
        -> winget install EclipseAdoptium.Temurin.21.JDK   具体修法
```

结尾会给结论和**退出码**：`0` = 能跑，`1` = 有阻塞问题。所以可以挂在钩子里：

```powershell
npm run setup -- -NoFix
if ($LASTEXITCODE -ne 0) { Write-Host '环境有问题，先修' }
```

### 14.4 它会改什么、不会改什么

| 动作 | 说明 |
| --- | --- |
| 写用户级 `JAVA_HOME` / `ANDROID_HOME` / `ANDROID_SDK_ROOT` | 值不对才写 |
| 把 `%JAVA_HOME%\bin` 加到用户 PATH 最前 | 已存在就不重复加 |
| 创建 `.npmrc` / `.env.local` 模板 / 装 node_modules | 已存在不覆盖（不会碰你的 API Key） |
| `winget install` Node / JDK | 仅在真的缺失时；执行前会打印提示 |
| 安装 Android SDK 组件 | 有 `sdkmanager` 才做 |
| 修改项目源码 / 改系统级 PATH / 装 Android Studio | **不会** |

只想看结果不动手，就加 `-NoFix`。

### 14.5 常见问题

**提示"无法加载文件，因为在此系统上禁止运行脚本"**

你机器的执行策略是 `RemoteSigned`，本地脚本本来就能跑；只有**从 zip 解压**出来的文件会带"网络标记"被拦：

```powershell
Unblock-File .\scripts\setup-env.ps1
```

或者临时绕过：`powershell -ExecutionPolicy Bypass -File .\scripts\setup-env.ps1`

**双击 .ps1 没反应** —— 默认行为是用记事本打开，不会执行。请在已打开的终端里运行。

**右键"使用 PowerShell 运行"跑完窗口就关了** —— 看不到结果。用终端运行。

**脚本能改系统级 PATH 吗** —— 不能，需要管理员。它只会提示"系统级 PATH 里还有旧 Java"。

### 14.6 已知限制

* `winget install` 分支未在"干净机器"上实测（开发机已有 Node/JDK）
* 真正执行 `npm install` 的分支未实测（会下载数百 MB）
* 系统级 PATH 的旧 Java 只能提示，不能自动清理

### 14.7 相关文件

* `scripts/setup-env.ps1` —— 脚本本体（**必须保存为 UTF-8 with BOM**，否则 PowerShell 5.1 会把中文读成乱码并报语法错误）
