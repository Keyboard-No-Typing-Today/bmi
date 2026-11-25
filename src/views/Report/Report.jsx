import { NavBar, Button, NoticeBar } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import { calcBMI, classify } from '../../utils/rules';
import { BOYS, GIRLS } from '../../utils/chartChild';

// 分类 → 样式信息；文案统一走 i18n 的 cat.* 命名空间
const META = {
  severeUnder: { color: '#ff3141', warn: true },
  under:       { color: '#1677ff', warn: false },
  normal:      { color: '#00b578', warn: false },
  over:        { color: '#ff8f1f', warn: false },
  obese:       { color: '#ed6a0c', warn: false },
  severeOver:  { color: '#ff3141', warn: true },
};

// 成人色带只有 4 格，严重档映射到最近的一格高亮
const ADULT_ACTIVE = { severeUnder: 'under', severeOver: 'obese' };

const ADULT_BANDS = [
  { cat: 'under',  label: '< 18.5',      color: '#1677ff' },
  { cat: 'normal', label: '18.5 – 22.9', color: '#00b578' },
  { cat: 'over',   label: '23 – 24.9',   color: '#ff8f1f' },
  { cat: 'obese',  label: '≥ 25',        color: '#ff3141' },
];

// 儿童色带：5 格，与 cat 一一对应
function childBands(row) {
  const [sUnder, under, normal, over] = row;
  return [
    { cat: 'severeUnder', label: `< ${sUnder}`,          color: '#ff3141' },
    { cat: 'under',       label: `${sUnder} – ${under}`, color: '#1677ff' },
    { cat: 'normal',      label: `${under} – ${normal}`, color: '#00b578' },
    { cat: 'over',        label: `${normal} – ${over}`,  color: '#ff8f1f' },
    { cat: 'severeOver',  label: `≥ ${over}`,            color: '#ff3141' },
  ];
}

export default function ReportScreen({ data, onBack }) {
  const { t } = useTranslation();
  const { height, weight, age, gender } = data;

  const bmi = calcBMI(weight, height);
  const cat = classify(bmi, age, gender);
  const meta = META[cat];
  const isChild = age <= 18;
  const displayAge = Math.min(Math.max(age, 6), 18);
  const genderLabel = t(gender === 'male' ? 'form.male' : 'form.female');

  const row = isChild ? (gender === 'male' ? BOYS : GIRLS)[displayAge] : null;
  const bands = isChild ? childBands(row) : ADULT_BANDS;
  const activeCat = isChild ? cat : (ADULT_ACTIVE[cat] || cat);

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6f8', paddingBottom: 24 }}>
      <NavBar onBack={onBack}>{t('nav.report')}</NavBar>

      {/* 主结果卡 */}
      <div style={{ background: '#fff', margin: 12, borderRadius: 12, padding: '28px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: '#8f8f8f', marginBottom: 6 }}>{t('report.yourBmi')}</div>
        <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1, color: meta.color }}>
          {bmi.toFixed(2)}
        </div>
        <div
          style={{
            display: 'inline-block', marginTop: 12, padding: '4px 14px', borderRadius: 999,
            background: meta.color, color: '#fff', fontSize: 15, fontWeight: 600,
          }}
        >
          {t(`cat.${cat}`)}
        </div>
        <div style={{ marginTop: 12, fontSize: 13, color: '#8f8f8f' }}>
          {t('report.summary', { gender: genderLabel, age, height, weight })}
        </div>
      </div>

      {/* 分级色带：成人 4 格 / 儿童 5 格 */}
      <div style={{ background: '#fff', margin: 12, borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
          {isChild
            ? t('report.childBands', { gender: genderLabel, age: displayAge })
            : t('report.adultBands')}
        </div>
        <div style={{ fontSize: 12, color: '#8f8f8f', marginBottom: 12 }}>
          {isChild ? t('report.sourceChild') : t('report.sourceAdult')}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {bands.map((b) => {
            const active = b.cat === activeCat;
            return (
              <div
                key={b.cat}
                style={{
                  flex: 1, borderRadius: 8, padding: '10px 4px', textAlign: 'center',
                  background: b.color, color: '#fff', opacity: active ? 1 : 0.35,
                  outline: active ? `3px solid ${b.color}` : 'none',
                  outlineOffset: 2,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600 }}>{t(`cat.${b.cat}`)}</div>
                <div style={{ fontSize: 10, marginTop: 2 }}>{b.label}</div>
              </div>
            );
          })}
        </div>

        {isChild && (
          <div style={{ fontSize: 11, color: '#8f8f8f', marginTop: 10 }}>
            {t('report.percentile')}
            {age < 6 && t('report.minorNote')}
          </div>
        )}
      </div>

      {/* 警告区：只有 severe 两档才渲染 */}
      {meta.warn && (
        <div style={{ margin: 12 }}>
          <NoticeBar color="alert" style={{ borderRadius: 12, fontSize: 14 }}>
            {cat === 'severeUnder' ? t('report.warnSevereUnder') : t('report.warnSevereOver')}
          </NoticeBar>
        </div>
      )}

      {/* 重新计算 */}
      <div style={{ margin: 12 }}>
        <Button block color="primary" size="large" onClick={onBack}>{t('report.recalc')}</Button>
      </div>
    </div>
  );
}
