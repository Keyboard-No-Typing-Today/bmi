import { NavBar, Button, NoticeBar } from 'antd-mobile';
import { calcBMI, classify } from '../../utils/rules';
import { BOYS, GIRLS } from '../../utils/chartChild';

// 分类 → 显示用的元信息
const META = {
  severeUnder: { label: '严重偏瘦', en: 'Severely Underweight', color: '#ff3141', warn: true },
  under:       { label: '偏瘦',     en: 'Underweight',          color: '#1677ff' },
  normal:      { label: '适中',     en: 'Normal',               color: '#00b578' },
  over:        { label: '过重',     en: 'Overweight',           color: '#ff8f1f' },
  obese:       { label: '肥胖',     en: 'Obese',                color: '#ed6a0c' },
  severeOver:  { label: '严重超重', en: 'Severely Overweight',  color: '#ff3141', warn: true },
};

// 成人：固定 4 格
const ADULT_BANDS = [
  { name: '偏瘦', label: '< 18.5',         color: '#1677ff' },
  { name: '适中', label: '18.5 – 22.9',    color: '#00b578' },
  { name: '过重', label: '23 – 24.9',      color: '#ff8f1f' },
  { name: '肥胖', label: '≥ 25',           color: '#ff3141' },
];

// 儿童：从"该年龄该性别"那一行生成 5 格
function childBands(row) {
  const [sUnder, under, normal, over] = row;
  return [
    { name: '严重偏瘦', label: `< ${sUnder}`,            color: '#ff3141' },
    { name: '偏瘦',     label: `${sUnder} – ${under}`,   color: '#1677ff' },
    { name: '适中',     label: `${under} – ${normal}`,   color: '#00b578' },
    { name: '超重',     label: `${normal} – ${over}`,    color: '#ff8f1f' },
    { name: '严重超重', label: `≥ ${over}`,              color: '#ff3141' },
  ];
}

export default function ReportScreen({ data, onBack }) {
  const { height, weight, age, gender } = data;

  const bmi = calcBMI(weight, height);
  const cat = classify(bmi, age, gender);
  const meta = META[cat];
  const isChild = age <= 18;

  // 儿童要把"实际查到的那一行"显示出来，让老师看到阈值来源
  const row = isChild
    ? (gender === 'male' ? BOYS : GIRLS)[Math.min(Math.max(age, 6), 18)]
    : null;
  const bands = isChild ? childBands(row) : ADULT_BANDS;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6f8', paddingBottom: 24 }}>
      <NavBar onBack={onBack}>BMI 报告</NavBar>

      {/* ① 主结果卡 */}
      <div style={{ background: '#fff', margin: 12, borderRadius: 12, padding: '28px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: '#8f8f8f', marginBottom: 6 }}>你的 BMI</div>
        <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1, color: meta.color }}>
          {bmi.toFixed(2)}
        </div>
        <div
          style={{
            display: 'inline-block', marginTop: 12, padding: '4px 14px', borderRadius: 999,
            background: meta.color, color: '#fff', fontSize: 15, fontWeight: 600,
          }}
        >
          {meta.label} / {meta.en}
        </div>
        <div style={{ marginTop: 12, fontSize: 13, color: '#8f8f8f' }}>
          {gender === 'male' ? '男' : '女'} · {age} 岁 · {height} cm · {weight} kg
        </div>
      </div>

      {/* ② 分级色带：成人 4 格 / 儿童 5 格 */}
      <div style={{ background: '#fff', margin: 12, borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
          {isChild ? `BMI-for-Age 分级（${gender === 'male' ? '男' : '女'} · ${Math.min(Math.max(age, 6), 18)} 岁）` : '成人 BMI 分级'}
        </div>
        <div style={{ fontSize: 12, color: '#8f8f8f', marginBottom: 12 }}>
          {isChild ? '依据：BMI_chart_child.pdf（HPB，6–18 岁）' : '依据：BMI_chart_adult.pdf（WHO 西太平洋区）'}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {bands.map((b) => {
            const active = b.name === meta.label;   // 当前所处的那一格
            return (
              <div
                key={b.name}
                style={{
                  flex: 1, borderRadius: 8, padding: '10px 4px', textAlign: 'center',
                  background: b.color, color: '#fff', opacity: active ? 1 : 0.35,
                  outline: active ? `3px solid ${b.color}` : 'none',
                  outlineOffset: 2,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600 }}>{b.name}</div>
                <div style={{ fontSize: 10, marginTop: 2 }}>{b.label}</div>
              </div>
            );
          })}
        </div>

        {isChild && (
          <div style={{ fontSize: 11, color: '#8f8f8f', marginTop: 10 }}>
            百分位：&lt;3rd / 3–5th / 5–90th / 90–97th / ≥97th
            {age < 6 && '（年龄小于 6 岁，按 6 岁一行计算，仅供参考）'}
          </div>
        )}
      </div>

      {/* ③ 警告区：只有 severe 两档才渲染 */}
      {meta.warn && (
        <div style={{ margin: 12 }}>
          <NoticeBar
            color="alert"
            style={{ borderRadius: 12, fontSize: 14 }}
          >
            ⚠ 你的 BMI 处于「{meta.label}」区间
            {cat === 'severeUnder'
              ? '，可能存在营养不良风险，建议尽快咨询医生或营养师。'
              : '，可能与肥胖相关疾病风险升高，建议尽快咨询医生或营养师。'}
          </NoticeBar>
        </div>
      )}

      {/* ④ 重新计算 */}
      <div style={{ margin: 12 }}>
        <Button block color="primary" size="large" onClick={onBack}>重新计算</Button>
      </div>
    </div>
  );
}