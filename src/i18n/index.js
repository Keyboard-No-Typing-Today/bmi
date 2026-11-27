import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zh from './locales/zh.json';
import en from './locales/en.json';

/** 支持的语言，菜单里直接用来渲染选项 */
export const LANGS = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
];

/** localStorage 里记住用户选择的键名 */
export const LANG_STORAGE_KEY = 'app:lang';

i18n
  // 自动检测语言：先看用户上次的选择，再看系统语言
  .use(LanguageDetector)
  // 把 i18next 接入 React，组件里才能用 useTranslation()
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zh },
      en: { translation: en },
    },
    fallbackLng: 'en', // 某个 key 缺英文/中文时回落，不会白屏
    supportedLngs: ['zh', 'en'],
    nonExplicitSupportedLngs: true, // zh-CN / zh-Hans 自动映射到 zh
    interpolation: {
      // React 本身会转义，这里再转一次会出现 &amp;
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: LANG_STORAGE_KEY,
    },
    // 本地 JSON 是同步就绪的，关掉 Suspense 避免首屏被挂起
    react: { useSuspense: false },
    // 找漏翻时把这里改成 true，控制台会打印缺失的 key
    debug: false,
  });

/** 让 <html lang> 跟着语言走，有利于无障碍和字体渲染 */
function syncHtmlLang(lng) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = String(lng).startsWith('zh') ? 'zh-Hans' : 'en';
}

syncHtmlLang(i18n.language);
i18n.on('languageChanged', syncHtmlLang);

// 开发期方便在浏览器控制台验证：__i18n.changeLanguage('en')
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  window.__i18n = i18n;
}

export default i18n;
