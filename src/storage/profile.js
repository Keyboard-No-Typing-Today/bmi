// 偏好设置：只用 localStorage，够用且零依赖。
// 在 Capacitor WebView 里它同样位于应用私有目录，行为与 SharedPreferences 一致。
const KEY = 'bmi:profile';

export function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || null;
  } catch {
    return null;
  }
}

export function saveProfile(p) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* 存储满或被禁用时静默失败，不影响主流程 */
  }
}
