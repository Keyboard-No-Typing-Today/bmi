// 只在 `npm start` 时生效（CRA 会自动加载 src/setupProxy.js）
// 作用：把 /llm/* 转发到 DeepSeek，绕开浏览器的 CORS 限制
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/llm',
    createProxyMiddleware({
      target: 'https://api.deepseek.com',
      changeOrigin: true,
      pathRewrite: { '^/llm': '' },
      proxyTimeout: 60000,
    })
  );
};
