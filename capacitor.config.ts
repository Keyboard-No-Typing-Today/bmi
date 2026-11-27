import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sytus.bmi',
  appName: 'BMI',
  webDir: 'build',
  plugins: {
    // 让 fetch 走安卓原生网络请求，绕过浏览器的 CORS 限制
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
