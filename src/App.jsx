import { useState } from 'react';
import { ActionSheet, ConfigProvider, Dialog } from 'antd-mobile';
import zhCN from 'antd-mobile/es/locales/zh-CN';
import enUS from 'antd-mobile/es/locales/en-US';
import { useTranslation } from 'react-i18next';
import { LANGS } from './i18n';
import HomeScreen from './views/Home/Home';
import ReportScreen from './views/Report/Report';
import HistoryScreen from './views/History/History';

export default function App() {
  // useTranslation 会在语言切换时触发重渲染，ConfigProvider 的 locale 也会跟着变
  const { t, i18n } = useTranslation();
  const isZh = String(i18n.language).startsWith('zh');

  const [screen, setScreen] = useState('home');
  const [data, setData] = useState(null);

  // Options Menu 状态
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  // 重置输入：改变 key 让 Home 重新挂载，表单自然清空
  const [homeKey, setHomeKey] = useState(0);

  const currentLang = (code) => String(i18n.language).startsWith(code);

  const handleMenuAction = (action) => {
    setMenuOpen(false);

    if (action.key === 'lang') {
      // 等一下再开第二个 ActionSheet，避免两个浮层同时关闭/打开打架
      setTimeout(() => setLangOpen(true), 200);
      return;
    }

    if (action.key === 'about') {
      Dialog.alert({
        title: t('about.title'),
        confirmText: t('common.ok'),
        content: (
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.7 }}>
            {t('about.body')}
          </div>
        ),
      });
      return;
    }

    if (action.key === 'history') {
      setScreen('history');
      return;
    }

    if (action.key === 'reset') {
      setData(null);
      setHomeKey((k) => k + 1);
      setScreen('home');
    }
  };

  const handleLangAction = (action) => {
    setLangOpen(false);
    if (action.key && action.key !== i18n.language) i18n.changeLanguage(action.key);
  };

  return (
    <ConfigProvider locale={isZh ? zhCN : enUS}>
      {screen === 'home' && (
        <HomeScreen
          key={homeKey}
          onMenu={() => setMenuOpen(true)}
          onSubmit={(d) => {
            setData(d);
            setScreen('report');
          }}
        />
      )}

      {screen === 'report' && (
        <ReportScreen
          data={data}
          onMenu={() => setMenuOpen(true)}
          onBack={() => setScreen('home')}
          onOpenHistory={() => setScreen('history')}
        />
      )}

      {screen === 'history' && (
        <HistoryScreen
          onMenu={() => setMenuOpen(true)}
          onBack={() => setScreen(data ? 'report' : 'home')}
        />
      )}

      {/* Options Menu：对应 Android ActionBar 右上角的溢出菜单 */}
      <ActionSheet
        visible={menuOpen}
        actions={[
          { key: 'lang', text: t('menu.language') },
          { key: 'history', text: t('menu.history') },
          { key: 'about', text: t('menu.about') },
          { key: 'reset', text: t('menu.reset'), danger: true },
        ]}
        onAction={handleMenuAction}
        onClose={() => setMenuOpen(false)}
        cancelText={t('menu.cancel')}
      />

      {/* 二级菜单：选语言，当前语言打勾 */}
      <ActionSheet
        visible={langOpen}
        actions={LANGS.map((l) => ({
          key: l.code,
          text: currentLang(l.code) ? `${l.label}  ✓` : l.label,
        }))}
        onAction={handleLangAction}
        onClose={() => setLangOpen(false)}
        cancelText={t('menu.cancel')}
      />
    </ConfigProvider>
  );
}
