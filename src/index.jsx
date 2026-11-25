import './i18n'; // 必须最先执行，早于任何使用 useTranslation() 的组件
import React from 'react';
import 'antd-mobile/es/global';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')).render(<App />);
