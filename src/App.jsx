import { useState } from 'react';
import { ConfigProvider } from 'antd-mobile';
import zhCN from 'antd-mobile/es/locales/zh-CN';
import enUS from 'antd-mobile/es/locales/en-US';
import { useTranslation } from 'react-i18next';
import HomeScreen from './views/Home/Home';
import ReportScreen from './views/Report/Report';

export default function App() {
  // useTranslation 会在语言切换时触发重渲染，
  // 所以 ConfigProvider 的 locale 也会跟着变
  const { i18n } = useTranslation();
  const isZh = String(i18n.language).startsWith('zh');

  const [screen, setScreen] = useState('home');
  const [data, setData] = useState(null);

  return (
    <ConfigProvider locale={isZh ? zhCN : enUS}>
      {screen === 'home' ? (
        <HomeScreen
          onSubmit={(d) => {
            setData(d);
            setScreen('report');
          }}
        />
      ) : (
        <ReportScreen data={data} onBack={() => setScreen('home')} />
      )}
    </ConfigProvider>
  );
}
