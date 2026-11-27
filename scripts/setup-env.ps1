<#
.SYNOPSIS
  本机环境体检 + 自动修复：判断这台机器能否运行本项目。

.DESCRIPTION
  不需要项目存在，也不需要 Node 已安装 —— 用 Windows 自带的 PowerShell 就能跑。
  检查 Node / npm / JDK / JAVA_HOME / PATH / Android SDK / adb / Git / 项目依赖。
  缺失项会尝试自动修复（winget 装软件、写环境变量、装 SDK 组件、npm install）。

.PARAMETER NoFix
  只体检，不修改任何东西。

.PARAMETER Build
  最后额外跑一次 npm run build 做冒烟测试。

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/setup-env.ps1
  powershell -ExecutionPolicy Bypass -File scripts/setup-env.ps1 -NoFix
  powershell -ExecutionPolicy Bypass -File scripts/setup-env.ps1 -Build
#>
[CmdletBinding()]
param(
  [switch]$NoFix,
  [switch]$Build
)

# 注意：不能把 $ErrorActionPreference 设成 SilentlyContinue ——
# 那样 java -version 这类写 stderr 的命令，2>&1 后输出会被吞掉，导致版本号读不到。
$ErrorActionPreference = 'Continue'
$rows = New-Object System.Collections.ArrayList

function Add-Row($level, $name, $detail, $fix) {
  [void]$rows.Add([pscustomobject]@{ Level = $level; Name = $name; Detail = $detail; Fix = $fix })
}
function Have($cmd) { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

function Get-JdkMajor($dir) {
  if (-not $dir) { return 0 }
  $java = Join-Path $dir 'bin\java.exe'
  if (-not (Test-Path $java)) { return 0 }
  $out = & $java -version 2>&1 | Out-String
  if ($out -match 'version "(\d+)') { return [int]$Matches[1] }
  return 0
}

function Find-Jdk21 {
  $candidates = @()
  if ($env:JAVA_HOME) { $candidates += $env:JAVA_HOME }
  $bases = @("$env:ProgramFiles\Eclipse Adoptium", "$env:ProgramFiles\Java", "C:\Java", "D:\")
  foreach ($base in $bases) {
    if (Test-Path $base) {
      Get-ChildItem $base -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match 'jdk-?21|temurin-?21|jdk21' } |
        ForEach-Object { $candidates += $_.FullName }
    }
  }
  foreach ($c in $candidates) {
    if ((Get-JdkMajor $c) -ge 21) { return $c }
  }
  return $null
}

function Try-Winget($id, $label) {
  if ($NoFix) { return $false }
  if (-not (Have winget)) {
    Add-Row 'warn' $label '系统没有 winget，无法自动安装' '请手动安装后重开终端'
    return $false
  }
  Write-Host "  -> 正在用 winget 安装 $label（可能要几分钟）..." -ForegroundColor Yellow
  & winget install --id $id -e --silent --accept-source-agreements --accept-package-agreements | Out-Null
  return ($LASTEXITCODE -eq 0)
}

Write-Host "===== 本机环境体检 =====" -ForegroundColor Cyan
Write-Host "主机: $env:COMPUTERNAME   用户: $env:USERNAME"

# ---------------- 1. Node.js ----------------
if (Have node) {
  $nodeV = (& node -v) -replace '^v', ''
  $nodeMajor = [int]($nodeV.Split('.')[0])
  if ($nodeMajor -ge 22) {
    Add-Row 'ok' 'Node.js' "v$nodeV"
  } else {
    Add-Row 'fail' 'Node.js' "v$nodeV（需要 >= 22）" 'winget install OpenJS.NodeJS.LTS'
    if (Try-Winget 'OpenJS.NodeJS.LTS' 'Node.js 22 LTS') {
      Add-Row 'fix' 'Node.js' '已发起安装' '安装完成后必须重开终端再跑一次本脚本'
    }
  }
} else {
  Add-Row 'fail' 'Node.js' '未安装' 'winget install OpenJS.NodeJS.LTS'
  if (Try-Winget 'OpenJS.NodeJS.LTS' 'Node.js 22 LTS') {
    Add-Row 'fix' 'Node.js' '已发起安装' '安装完成后必须重开终端再跑一次本脚本'
  }
}

# ---------------- 2. npm ----------------
if (Have npm) {
  Add-Row 'ok' 'npm' ('v' + (& npm -v))
} else {
  Add-Row 'fail' 'npm' '未找到（随 Node 一起安装）' '装好 Node 后 npm 会自动出现'
}

# ---------------- 3. JDK ----------------
$jdkDir = Find-Jdk21
if ($jdkDir) {
  Add-Row 'ok' 'JDK 21' "$jdkDir（major = $((Get-JdkMajor $jdkDir))）"
} else {
  $foundMajor = 0
  if (Have java) {
    $v = & java -version 2>&1 | Out-String
    if ($v -match 'version "(\d+)') { $foundMajor = [int]$Matches[1] }
  }
  if ($foundMajor -gt 0) {
    Add-Row 'fail' 'JDK 21' "只找到 Java $foundMajor，构建 APK 需要 21" 'winget install EclipseAdoptium.Temurin.21.JDK'
  } else {
    Add-Row 'fail' 'JDK 21' '未找到' 'winget install EclipseAdoptium.Temurin.21.JDK'
  }
  if (Try-Winget 'EclipseAdoptium.Temurin.21.JDK' 'Temurin JDK 21') {
    Add-Row 'fix' 'JDK 21' '已发起安装' '重开终端后重新运行本脚本'
    $jdkDir = Find-Jdk21
  }
}

# ---------------- 4. JAVA_HOME 与 PATH ----------------
if ($jdkDir) {
  if ($env:JAVA_HOME -and ($env:JAVA_HOME.TrimEnd('\') -eq $jdkDir.TrimEnd('\'))) {
    Add-Row 'ok' 'JAVA_HOME' $env:JAVA_HOME
  } elseif ($NoFix) {
    Add-Row 'warn' 'JAVA_HOME' "当前为 '$env:JAVA_HOME'，应指向 $jdkDir" ('setx JAVA_HOME "' + $jdkDir + '"')
  } else {
    [Environment]::SetEnvironmentVariable('JAVA_HOME', $jdkDir, 'User')
    $env:JAVA_HOME = $jdkDir
    Add-Row 'fix' 'JAVA_HOME' "已设置为 $jdkDir（用户级）" '重开终端生效'
  }

  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  $needBin = Join-Path $jdkDir 'bin'
  if ($userPath -and (($userPath -split ';') -contains $needBin)) {
    Add-Row 'ok' 'JAVA_HOME bin 在 PATH 中' $needBin
  } elseif ($NoFix) {
    Add-Row 'warn' 'PATH' '缺少 JDK 的 bin 目录' ('把 ' + $needBin + ' 加到 PATH 最前面')
  } else {
    $newPath = if ($userPath) { $needBin + ';' + $userPath } else { $needBin }
    [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
    Add-Row 'fix' 'PATH' "已把 $needBin 加到用户 PATH 最前" '注意：系统级 PATH 仍优先，若 system32/旧 JDK 在前，需要管理员把它删掉'
  }

  $oldJava = @()
  foreach ($p in ($env:Path -split ';')) {
    if ($p -match 'javapath|jdk-18|jdk-8|jdk-11|jdk-17') { $oldJava += $p }
  }
  if ($oldJava.Count -gt 0) {
    Add-Row 'warn' 'PATH 里有旧 Java' ($oldJava -join ' ; ') '可能抢在 JDK 21 前面，建议删掉'
  }
}

# ---------------- 5. Android SDK ----------------
$sdk = $env:ANDROID_HOME
if (-not $sdk -or -not (Test-Path $sdk)) {
  $guess = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
  if (Test-Path $guess) {
    $sdk = $guess
    if ($NoFix) {
      Add-Row 'warn' 'ANDROID_HOME' '未设置，但找到了默认 SDK 目录' ('setx ANDROID_HOME "' + $guess + '"')
    } else {
      [Environment]::SetEnvironmentVariable('ANDROID_HOME', $guess, 'User')
      [Environment]::SetEnvironmentVariable('ANDROID_SDK_ROOT', $guess, 'User')
      $env:ANDROID_HOME = $guess
      Add-Row 'fix' 'ANDROID_HOME' "已设置为 $guess（用户级）" '重开终端生效'
    }
  } else {
    Add-Row 'fail' 'ANDROID_HOME' '未设置，也没找到默认 SDK 目录' '安装 Android Studio，或用 sdkmanager 安装 SDK'
  }
}

if ($sdk -and (Test-Path $sdk)) {
  Add-Row 'ok' 'Android SDK' $sdk
  $sdkmanager = Join-Path $sdk 'cmdline-tools\bin\sdkmanager.bat'
  $need = @()
  if (-not (Test-Path (Join-Path $sdk 'platforms\android-36'))) { $need += 'platforms;android-36' }
  if (-not (Test-Path (Join-Path $sdk 'build-tools\36.0.0'))) { $need += 'build-tools;36.0.0' }
  if (-not (Test-Path (Join-Path $sdk 'platform-tools\adb.exe'))) { $need += 'platform-tools' }

  if ($need.Count -eq 0) {
    Add-Row 'ok' 'SDK 组件' 'android-36 / build-tools 36.0.0 / platform-tools 齐全'
  } elseif ($NoFix) {
    Add-Row 'warn' 'SDK 组件' ('缺: ' + ($need -join ', ')) ('sdkmanager ' + ($need -join ' '))
  } elseif (Test-Path $sdkmanager) {
    Write-Host "  -> 正在安装 SDK 组件: $($need -join '，')" -ForegroundColor Yellow
    & $sdkmanager @need 2>&1 | Out-Null
    Add-Row 'fix' 'SDK 组件' ('已尝试安装: ' + ($need -join ', ')) '若失败，用 Android Studio 的 SDK Manager 手动装'
  } else {
    Add-Row 'warn' 'SDK 组件' ('缺: ' + ($need -join ', ') + '（没有 sdkmanager）') '用 Android Studio 的 SDK Manager 安装'
  }
}

if (Have adb) {
  Add-Row 'ok' 'adb' ((& adb version 2>&1 | Select-Object -First 1).Trim())
} else {
  Add-Row 'warn' 'adb' '不在 PATH 中' '把 SDK 的 platform-tools 目录加到 PATH'
}

# ---------------- 6. Git ----------------
if (Have git) {
  Add-Row 'ok' 'Git' ((& git --version) -replace 'git version ', '')
} else {
  Add-Row 'warn' 'Git' '未安装（用于克隆代码）' 'winget install Git.Git'
}

# ---------------- 7. 项目本身 ----------------
$projectRoot = Split-Path $PSScriptRoot -Parent
$hasProject = Test-Path (Join-Path $projectRoot 'package.json')

if (-not $hasProject) {
  Add-Row 'warn' '项目' '当前目录没有 package.json（代码还没克隆）' 'git clone https://github.com/Keyboard-No-Typing-Today/bmi.git'
} else {
  Add-Row 'ok' '项目' $projectRoot

  $pkg = Get-Content (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json
  $required = @('react','react-dom','antd-mobile','i18next','react-i18next','@capacitor/core','@capacitor/android','@capacitor-community/sqlite','recharts')
  $missingPkg = @()
  foreach ($d in $required) {
    if (-not ($pkg.dependencies.$d -or $pkg.devDependencies.$d)) { $missingPkg += $d }
  }
  if ($missingPkg.Count -eq 0) {
    Add-Row 'ok' '依赖声明' ("$($required.Count) 个关键包都在 package.json 里")
  } else {
    Add-Row 'warn' '依赖声明' ('缺: ' + ($missingPkg -join ', ')) ('npm i ' + ($missingPkg -join ' '))
  }

  $needInstall = -not (Test-Path (Join-Path $projectRoot 'node_modules\react\package.json'))
  if (-not $needInstall) {
    Add-Row 'ok' 'node_modules' '关键包已安装'
  } elseif ($NoFix) {
    Add-Row 'fail' 'node_modules' '缺失或不完整' 'npm install'
  } elseif (Have npm) {
    Write-Host "  -> 正在 npm install（可能要几分钟）..." -ForegroundColor Yellow
    Push-Location $projectRoot
    & npm install 2>&1 | Out-Null
    Pop-Location
    if (Test-Path (Join-Path $projectRoot 'node_modules\react\package.json')) {
      Add-Row 'fix' 'node_modules' '已安装完成'
    } else {
      Add-Row 'fail' 'node_modules' '安装失败' '进入项目目录手动 npm install 查看报错'
    }
  }

  if (-not (Test-Path (Join-Path $projectRoot '.npmrc'))) {
    if ($NoFix) {
      Add-Row 'warn' '.npmrc' '缺失（会有 peer 依赖冲突）' '新建 .npmrc 写入 legacy-peer-deps=true'
    } else {
      Set-Content -Path (Join-Path $projectRoot '.npmrc') -Value 'legacy-peer-deps=true' -Encoding ascii
      Add-Row 'fix' '.npmrc' '已创建 legacy-peer-deps=true'
    }
  } else {
    Add-Row 'ok' '.npmrc' '已存在'
  }

  $envFile = Join-Path $projectRoot '.env.local'
  $hasKey = (Test-Path $envFile) -and ((Get-Content $envFile -Raw) -match 'REACT_APP_LLM_API_KEY=\S+')
  if ($hasKey) {
    Add-Row 'ok' '.env.local' 'LLM Key 已配置（不显示内容）'
  } elseif ($NoFix) {
    Add-Row 'warn' '.env.local' '没有 LLM Key（AI 建议会提示未配置）' '在 .env.local 里填 REACT_APP_LLM_API_KEY'
  } else {
    if (-not (Test-Path $envFile)) {
      @('# 填你自己的 DeepSeek Key','REACT_APP_LLM_BASE_URL=https://api.deepseek.com','REACT_APP_LLM_MODEL=deepseek-chat','REACT_APP_LLM_API_KEY=') | Set-Content -Path $envFile -Encoding utf8
    }
    Add-Row 'warn' '.env.local' '已生成模板，Key 还是空的' '填好 Key 后重启 npm start'
  }

  $gp = Join-Path $projectRoot 'android\gradle.properties'
  if (Test-Path $gp) {
    $pin = Select-String -Path $gp -Pattern 'org\.gradle\.java\.home=(.+)' -ErrorAction SilentlyContinue
    if ($pin) {
      Add-Row 'ok' 'gradle.properties' ('已锁定 JDK: ' + $pin.Matches[0].Groups[1].Value.Trim())
    } else {
      Add-Row 'warn' 'gradle.properties' '没锁 JDK，构建时可能用到 PATH 里的旧 Java' '加一行 org.gradle.java.home=你的JDK21路径'
    }
  }

  if ($Build -and (Have npm)) {
    Write-Host "  -> 正在 npm run build 冒烟测试..." -ForegroundColor Yellow
    Push-Location $projectRoot
    & npm run build 2>&1 | Out-Null
    Pop-Location
    if (Test-Path (Join-Path $projectRoot 'build\index.html')) {
      Add-Row 'ok' '构建冒烟' 'npm run build 成功'
    } else {
      Add-Row 'fail' '构建冒烟' 'npm run build 失败' '进入项目目录手动执行查看报错'
    }
  }
}

# ---------------- 汇总 ----------------
Write-Host ""
Write-Host "===== 结果 =====" -ForegroundColor Cyan
foreach ($r in $rows) {
  $mark = switch ($r.Level) { 'ok' { 'OK' } 'fix' { 'FIX' } 'warn' { 'WARN' } default { 'FAIL' } }
  $color = switch ($r.Level) { 'ok' { 'Green' } 'fix' { 'Cyan' } 'warn' { 'Yellow' } default { 'Red' } }
  Write-Host ("[{0,-4}] {1}: {2}" -f $mark, $r.Name, $r.Detail) -ForegroundColor $color
  if ($r.Fix -and $r.Level -ne 'ok') { Write-Host ('        -> ' + $r.Fix) -ForegroundColor DarkGray }
}

$fails = @($rows | Where-Object { $_.Level -eq 'fail' }).Count
$fixes = @($rows | Where-Object { $_.Level -eq 'fix' }).Count

Write-Host ""
Write-Host "===== 结论 =====" -ForegroundColor Cyan
if ($fails -eq 0) {
  Write-Host "这台机器可以运行本项目" -ForegroundColor Green
  Write-Host "  启动网页: cd $projectRoot ; npm start"
  Write-Host '  构建 APK: npm run build ; npx cap sync android ; cd android ; .\gradlew.bat assembleDebug'
  if ($fixes -gt 0) { Write-Host "  已自动修复 $fixes 项，请重开终端让环境变量生效" -ForegroundColor Cyan }
} else {
  Write-Host "有 $fails 项阻塞问题，按上面的 -> 处理" -ForegroundColor Red
}
exit $(if ($fails -eq 0) { 0 } else { 1 })
