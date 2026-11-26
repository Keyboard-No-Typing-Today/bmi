import { useRef, useState } from 'react';
import { NavBar, Button, NoticeBar, Toast } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import { calcBMI, classify } from '../../utils/rules';
import { BOYS, GIRLS } from '../../utils/chartChild';
import MenuButton from '../../components/MenuButton';

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

const MENU_W = 168;   // 菜单大致宽高，用来做边界夹取
const MENU_H = 150;
const LONG_PRESS_MS = 600;

export default function ReportScreen({ data, onBack, onMenu }) {
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

  // ---- Context Menu（长按结果卡） ----
  const [ctx, setCtx] = useState({ open: false, x: 0, y: 0 });
  const pressTimer = useRef(null);

  const startPress = (e) => {
    const p = e.touches ? e.touches[0] : e;
    clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      setCtx({
        open: true,
        x: Math.max(8, Math.min(p.clientX - 24, window.innerWidth - MENU_W - 8)),
        y: Math.max(8, Math.min(p.clientY - 24, window.innerHeight - MENU_H - 8)),
      });
    }, LONG_PRESS_MS);
  };

  // 手指一动就取消：用户在滚动页面，不该弹菜单
  const cancelPress = () => clearTimeout(pressTimer.current);
  const closeCtx = () => setCtx((c) => ({ ...c, open: false }));

  const resultText =
    t('report.yourBmi') + ': ' + bmi.toFixed(2) + ' (' + t('cat.' + cat) + ')' +
    ' | ' + t('report.summary', { gender: genderLabel, age, height, weight });

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(resultText);
      Toast.show({ icon: 'success', content: t('toast.copied') });
    } catch {
      Toast.show({ icon: 'fail', content: t('toast.copyFailed') });
    }
  };

  const shareResult = async () => {
    if (!navigator.share) {
      Toast.show({ content: t('toast.shareUnsupported') });
      return;
    }
    try {
      await navigator.share({ title: t('nav.report'), text: resultText });
    } catch {
      /* 用户取消分享，不提示 */
    }
  };

  const menuItems = [
    { key: 'copy', label: t('menu.copy'), onClick: copyResult },
    { key: 'share', label: t('menu.share'), onClick: shareResult },
    { key: 'reset', label: t('menu.reset'), danger: true, onClick: onBack },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6f8', paddingBottom: 24 }}>
      <NavBar onBack={onBack} right={<MenuButton onClick={onMenu} />}>
        {t('nav.report')}
      </NavBar>

      {/* 主结果卡：长按可呼出 Context Menu */}
      <div
        onTouchStart={startPress}
        onTouchMove={cancelPress}
        onTouchEnd={cancelPress}
        onTouchCancel={cancelPress}
        onMouseDown={startPress}
        onMouseUp={cancelPress}
        onMouseLeave={cancelPress}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          background: '#fff', margin: 12, borderRadius: 12, padding: '28px 16px',
          textAlign: 'center',
          userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none',
        }}
      >
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
        <div style={{ marginTop: 8, fontSize: 11, color: '#c0c4cc' }}>
          {t('report.hintLongPress')}
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

      {/* Context Menu：对应 Android 的 registerForContextMenu + onCreateContextMenu */}
      {ctx.open && (
        <>
          <div onClick={closeCtx} style={{ position: 'fixed', inset: 0, zIndex: 900 }} />
          <div
            style={{
              position: 'fixed', left: ctx.x, top: ctx.y, zIndex: 901, minWidth: 152,
              background: '#fff', borderRadius: 12, overflow: 'hidden',
              boxShadow: '0 8px 28px rgba(0, 0, 0, 0.18)',
            }}
          >
            {menuItems.map((item, i) => (
              <div
                key={item.key}
                onClick={() => { closeCtx(); item.onClick && item.onClick(); }}
                style={{
                  padding: '12px 18px', fontSize: 15,
                  color: item.danger ? '#ff3141' : '#1f2328',
                  borderBottom: i < menuItems.length - 1 ? '1px solid #f0f0f0' : 'none',
                  cursor: 'pointer',
                }}
              >
                {item.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
