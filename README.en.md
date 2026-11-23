# BMI Calculator — React + Capacitor + Android

A mobile BMI calculator built with **React (CRA)** and packaged as a native Android app with
**Capacitor**. It supports age- and gender-aware classification: adults use the HK Centre for
Health Protection (WHO Western Pacific) BMI chart, while children and youth (age <= 18) use the
Singapore HPB **BMI-for-Age** percentile chart. Severe underweight / severe overweight results
trigger a dedicated warning UI.

---

## 1. Tech stack

| Layer | Technology | Version (tested) |
| --- | --- | --- |
| UI | React | 18.3.1 |
| Component library | antd-mobile | 5.43.0 |
| Build tool (web) | react-scripts (Create React App) | 5.0.1 |
| Native wrapper | @capacitor/core / android / cli | 8.6.2 |
| Android build | Android Gradle Plugin | 8.13.0 |
| Gradle | Gradle Wrapper | 8.14.3 |
| App ID / name | `com.sytus.bmi` / `BMI` | — |

> antd-mobile v5 supports **React 16–18 only**. Do not upgrade React to 19 without reading
> section 11.2.

---

## 2. Prerequisites

### 2.1 Required software

| Tool | Minimum | Tested version | Why it is needed |
| --- | --- | --- | --- |
| Node.js | **>= 22.0.0** | 22.21.1 | Capacitor 8 requires Node >= 22 |
| npm | >= 10 | 10.9.4 | dependency install |
| JDK | **17+**, recommended **21** | Temurin 21.0.12.1+1 | AGP 8.13 / Capacitor 8 compile with Java 21 source level |
| Android SDK Platform | **36** | android-36 | `compileSdkVersion = 36` |
| Android Build-Tools | **36.0.0** | 36.0.0 | packaging the APK |
| adb (platform-tools) | >= 35 | 35.0.2 | install / debug on device |
| Android Studio | optional | 2024.2.1 | only to manage AVDs / SDK; **not** required to build |

**Not required:** a standalone Gradle install. The project ships `android/gradlew.bat`
(Gradle Wrapper 8.14.3) and will download/use it automatically.

**Why JDK 21 matters:** `node_modules/@capacitor/android/capacitor/build.gradle` sets
`sourceCompatibility = JavaVersion.VERSION_21`. Building with JDK 18 or lower fails with:

```
Execution failed for task ':capacitor-android:compileDebugJavaWithJavac'.
> Java compilation initialization error
    错误: 无效的源发行版: 21        <-- (mojibake on a GBK console)
```

---

## 3. One-time environment setup (Windows)

### 3.1 Node.js

Install Node 22 LTS and verify:

```powershell
node -v     # v22.x
npm -v      # 10.x
```

### 3.2 JDK 21 and `JAVA_HOME`

```powershell
# Example: Temurin 21 installed at D:\jdk-21.0.12.1+1
[Environment]::SetEnvironmentVariable('JAVA_HOME','D:\jdk-21.0.12.1+1','Machine')
```

Open a **new** terminal (environment changes do not affect already-running shells) and verify:

```powershell
echo $env:JAVA_HOME
java -version          # must print openjdk version 21.x
```

> If `java -version` still reports Java 8/18, an older JDK launcher is earlier in `PATH`.
> Either remove it or put `%JAVA_HOME%\bin` first. Gradle itself only needs `JAVA_HOME`, but
> `keytool`, `npx cap run` and other tools pick `java` from `PATH`.

**This project pins the JDK explicitly** in `android/gradle.properties` so the build never
depends on the shell environment:

```properties
org.gradle.java.home=D:/jdk-21.0.12.1+1
```

Update that path if you move the JDK. Note it uses forward slashes.

### 3.3 Android SDK

Install via Android Studio → SDK Manager, or the command line:

```powershell
$env:ANDROID_HOME\cmdline-tools\bin\sdkmanager.bat "platforms;android-36" "build-tools;36.0.0" "platform-tools"
$env:ANDROID_HOME\cmdline-tools\bin\sdkmanager.bat --licenses   # accept all
```

Set the environment variable (Capacitor/Gradle read it):

```powershell
[Environment]::SetEnvironmentVariable('ANDROID_HOME','C:\Users\<you>\AppData\Local\Android\Sdk','Machine')
[Environment]::SetEnvironmentVariable('ANDROID_SDK_ROOT','C:\Users\<you>\AppData\Local\Android\Sdk','Machine')
```

Verify:

```powershell
adb version      # Android Debug Bridge version 1.0.41 / 35.x
```

### 3.4 Verify the whole toolchain

```powershell
cd android
.\gradlew.bat -version     # JVM line must read 21.x
```

---

## 4. Install project dependencies

```powershell
cd <project-root>
npm install
```

---

## 5. Project structure

```
bmi/
├── public/                 # CRA HTML shell + icons
├── src/
│   ├── index.jsx           # entry: imports antd-mobile global styles, mounts <App/>
│   ├── App.jsx             # screen switcher (Home <-> Report), keeps selected input
│   ├── utils/
│   │   ├── chartChild.js   # HPB BMI-for-age lookup table (boys / girls, age 6–18)
│   │   └── rules.js        # calcBMI(), classifyAdult(), classifyChild(), classify()
│   └── views/
│       ├── Home/Home.jsx   # input screen: height, weight, age, gender + validation
│       └── Report/Report.jsx # result screen: BMI, band, warning UI
├── capacitor.config.ts     # appId, appName, webDir: 'build'
└── android/                # generated native project (commit this)
```

`webDir` points at `build/`, the CRA production output. **Never** point Capacitor at `src/`.

---

## 6. Development (browser)

```powershell
npm start
```

Opens http://localhost:3000. Use Chrome DevTools device mode (375 × 812) for a realistic
phone layout. The page hot-reloads on save.

---

## 7. Run on Android

The web bundle must be rebuilt and copied into the native project **every time** React code
changes. Skipping step 2 is the #1 cause of "I changed the code but the app looks the same".

```powershell
# 1. build the web bundle -> build/
npm run build

# 2. copy build/ into android/app/src/main/assets/public + update plugins
npx cap sync android

# 3a. build + install + launch (single command)
npx cap run android

# 3b. or build the APK manually and install it
cd android
.\gradlew.bat assembleDebug
adb install -r .\app\build\outputs\apk\debug\app-debug.apk
```

APK output: `android/app/build/outputs/apk/debug/app-debug.apk`
Gradle output: `android/app/build/outputs/apk/release/app-release.apk`

### 7.1 Device / emulator

```powershell
adb devices            # device must show "device", not "unauthorized"
npx cap run android --target emulator-5554    # pick a specific target
npx cap run android --list                    # list available targets
```

### 7.2 Live reload (recommended while developing UI)

```powershell
# terminal 1
npm start

# terminal 2
npx cap run android -l
```

* `-l` / `--live-reload` points the WebView at `http://<your-LAN-IP>:3000` (auto-detected).
* **`--external` no longer exists in Capacitor 8** — the LAN IP is now the default. Use
  `--host <ip>`, `--port <port>`, `--https` or `--forwardPorts 3000:3000` if needed.
* The command **temporarily rewrites** `android/app/src/main/assets/capacitor.config.json`
  and reverts it on `Ctrl+C` (press once, then wait). If the process is killed hard, the file
  keeps a stale `server.url` and the app will white-screen. Fix: `npx cap sync android`.
* Android blocks cleartext HTTP by default. For live reload create
  `android/app/src/debug/AndroidManifest.xml`:

  ```xml
  <?xml version="1.0" encoding="utf-8"?>
  <manifest xmlns:android="http://schemas.android.com/apk/res/android">
      <application android:usesCleartextTraffic="true" />
  </manifest>
  ```

---

## 8. Release build (signed)

### 8.1 Create a keystore (once — back it up!)

```powershell
keytool -genkey -v -keystore bmi-release.keystore -alias bmi -keyalg RSA -keysize 2048 -validity 10000
```

### 8.2 Configure signing

Create `android/keystore.properties` (never commit it):

```properties
storeFile=../../bmi-release.keystore
storePassword=<password>
keyAlias=bmi
keyPassword=<password>
```

In `android/app/build.gradle` load it and add a `signingConfigs.release` block, then set
`buildTypes.release.signingConfig = signingConfigs.release`.

### 8.3 Build

```powershell
cd android
.\gradlew.bat assembleRelease    # signed APK  -> app/build/outputs/apk/release/
.\gradlew.bat bundleRelease      # signed AAB  -> app/build/outputs/bundle/release/  (Play Store)
```

Bump `versionCode` / `versionName` in `android/app/build.gradle` for every store upload.

---

## 9. Command cheat sheet

| Goal | Command |
| --- | --- |
| Install deps | `npm install` |
| Dev server | `npm start` |
| Production web build | `npm run build` |
| Copy web build into Android | `npx cap sync android` |
| Copy assets only (no plugin update) | `npx cap copy android` |
| Build + install + launch | `npx cap run android` |
| Live reload | `npx cap run android -l` |
| Open native project in Android Studio | `npx cap open android` |
| Diagnose environment | `npx cap doctor` |
| Debug APK | `cd android; .\gradlew.bat assembleDebug` |
| Release APK / AAB | `cd android; .\gradlew.bat assembleRelease` / `bundleRelease` |
| Stop Gradle daemons | `cd android; .\gradlew.bat --stop` |
| List devices | `adb devices` |
| Install APK | `adb install -r <path-to-apk>` |
| App logs | `adb logcat \| Select-String -Pattern "chromium\|Capacitor"` |
| Screenshot | `adb shell screencap -p /sdcard/s.png; adb pull /sdcard/s.png .` |
| Clean build | `cd android; .\gradlew.bat clean` |

---

## 10. Troubleshooting

### 10.1 `Java compilation initialization error` (often with garbled Chinese)
The Gradle daemon is running on a JDK older than 21.
```powershell
cd android
.\gradlew.bat --stop
.\gradlew.bat -version      # JVM: must be 21.x
```
If it still shows 18, check `org.gradle.java.home` in `android/gradle.properties`.
To read javac errors in English:
```powershell
.\gradlew.bat assembleDebug --stacktrace -Dorg.gradle.jvmargs="-Xmx1536m -Duser.language=en -Duser.country=US -Dfile.encoding=UTF-8"
```

### 10.2 `unmountComponentAtNode is not a function`
React 19 removed that API; antd-mobile v5 still calls it when a `Toast`/`Dialog` closes.
Fix: stay on React 18.
```powershell
npm install react@18.3.1 react-dom@18.3.1
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
```

### 10.3 App shows a white screen after install
Almost always a missing sync:
```powershell
npm run build
npx cap sync android
cd android; .\gradlew.bat assembleDebug
```
If it persisted after a live-reload session, inspect `android/app/src/main/assets/capacitor.config.json`
and remove any leftover `"server": { "url": ... }` (or just run `npx cap sync android`).

### 10.4 `error: unknown option '--external'`
Removed in Capacitor 8. Use `npx cap run android -l` (LAN IP is the default now).

### 10.5 Out of memory / many Gradle daemons
```powershell
cd android
.\gradlew.bat --stop
```
Tune `org.gradle.jvmargs` in `android/gradle.properties` (default `-Xmx1536m`).

### 10.6 `npx cap` says the config cannot be found
Run Capacitor commands from the **project root** (where `capacitor.config.ts` lives),
not from inside `android/`.

---

## 11. Tested environment (reference machine)

| Item | Value |
| --- | --- |
| OS | Windows 10.0.26100 |
| Node / npm | 22.21.1 / 10.9.4 |
| JAVA_HOME | `D:\jdk-21.0.12.1+1` (Temurin 21.0.12.1+1) |
| ANDROID_HOME | `C:\Users\<user>\AppData\Local\Android\Sdk` |
| SDK platforms / build-tools | android-36 / 36.0.0 |
| adb | 35.0.2 |
| Gradle dist | 8.14.3 (wrapper) |

---

## 12. Reference

* Adult chart: `BMI_chart_adult.pdf` — Centre for Health Protection (HK), WHO Western Pacific
  Region 2000. Bands: <18.5 underweight, 18.5–22.9 normal, 23–24.9 overweight, >=25 obese.
* Child chart: `BMI_chart_child.pdf` — Health Promotion Board (Singapore), BMI-for-Age 6–18
  years, separate tables for boys and girls, 5 bands by percentile
  (<3rd, 3rd–<5th, 5th–<90th, 90th–<97th, >=97th).
* Adult "severe" bands are not defined by the HK chart; this project uses **<16** and **>=30**
  (WHO severe thinness / obesity class II) and labels them as warning states.