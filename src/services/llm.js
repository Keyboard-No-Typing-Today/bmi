const BASE = process.env.REACT_APP_LLM_BASE_URL || 'https://api.deepseek.com';
const MODEL = process.env.REACT_APP_LLM_MODEL || 'deepseek-chat';
const KEY = process.env.REACT_APP_LLM_API_KEY || '';
const TIMEOUT_MS = 45000;

const LANG_NAME = { zh: 'Simplified Chinese', en: 'English' };

// 原生环境用绝对地址（CapacitorHttp 走原生请求，没有 CORS）；
// 浏览器里走 src/setupProxy.js 提供的 /llm 代理。
function endpoint() {
  const native =
    typeof window !== 'undefined' &&
    window.Capacitor &&
    typeof window.Capacitor.isNativePlatform === 'function' &&
    window.Capacitor.isNativePlatform();
  return native ? BASE + '/chat/completions' : '/llm/chat/completions';
}

function buildMessages(d, strict) {
  const langName = LANG_NAME[d.lang] || 'English';
  const childRule =
    d.age <= 18 ? 'The user is a child or teenager; suggest involving a parent or guardian.' : '';

  const system = [
    'You are a careful health assistant inside a BMI calculator app.',
    'Give 3 short sentences of practical, general lifestyle advice.',
    'Never diagnose diseases, never prescribe medicine, never mention being an AI model.',
    strict
      ? 'IMPORTANT: You MUST answer entirely in ' + langName + '. Do not use any other language.'
      : 'Answer in ' + langName + '.',
    childRule,
  ]
    .filter(Boolean)
    .join(' ');

  const payload = {
    age: d.age,
    gender: d.gender,
    height_cm: d.height,
    weight_kg: d.weight,
    bmi: Number(d.bmi.toFixed(2)),
    category: d.category,
    chart: d.age <= 18 ? 'BMI-for-age (6-18)' : 'adult BMI',
    language: d.lang,
  };

  return [
    { role: 'system', content: system },
    { role: 'user', content: 'Here is my data, please give advice: ' + JSON.stringify(payload) },
  ];
}

async function callOnce(messages) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(endpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + KEY,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 320,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = new Error('HTTP ' + res.status);
      err.code = res.status === 401 || res.status === 403 ? 'auth' : 'http';
      throw err;
    }

    const data = await res.json();
    const text =
      data && data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content.trim()
        : '';
    if (!text) {
      const err = new Error('empty');
      err.code = 'empty';
      throw err;
    }
    return text;
  } catch (e) {
    if (e.name === 'AbortError') {
      const err = new Error('timeout');
      err.code = 'timeout';
      throw err;
    }
    if (!e.code) e.code = 'network';
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// 中文模式下如果模型返回了英文，强制重试一次
function looksLikeChinese(text) {
  const cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const total = text.replace(/\s/g, '').length || 1;
  return cjk / total > 0.15;
}

export async function fetchAdvice(data) {
  if (!KEY) {
    const err = new Error('no key');
    err.code = 'nokey';
    throw err;
  }

  // 调用方可能传 'zh-CN' / 'zh-Hans'，统一成基础语言码
  const lang = String(data.lang || 'en').startsWith('zh') ? 'zh' : 'en';
  const payload = { ...data, lang };

  let text = await callOnce(buildMessages(payload, false));

  // 中文模式下模型跑了英文就强制重试一次
  if (lang === 'zh' && !looksLikeChinese(text)) {
    text = await callOnce(buildMessages(payload, true));
  }
  return text;
}
