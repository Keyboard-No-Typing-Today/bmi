import { NavBar } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import MenuButton from './MenuButton';

/**
 * 占位页：新页面在填充实际内容前，先用它跑通导航。
 * 用法：<PlaceholderPage titleKey="nav.pageA" onMenu={...} onBack={...} />
 */
export default function PlaceholderPage({ titleKey, onMenu, onBack }) {
  const { t } = useTranslation();

  return (
    <div className="page">
      <NavBar onBack={onBack} right={<MenuButton onClick={onMenu} />}>
        {t(titleKey)}
      </NavBar>

      <div className="placeholder">
        <div className="placeholder-title">{t('page.placeholderTitle')}</div>
        <p className="placeholder-text">{t('page.placeholderBody')}</p>
      </div>
    </div>
  );
}
