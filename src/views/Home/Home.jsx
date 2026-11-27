import { Button, NavBar } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import MenuButton from '../../components/MenuButton';

// 首页入口：要加/删页面，改这个数组 + PAGES 注册表即可
const ENTRIES = [
  { screen: 'pageA' },
  { screen: 'pageB' },
  { screen: 'pageC' },
];

export default function HomeScreen({ onMenu, onNavigate }) {
  const { t } = useTranslation();

  return (
    <div className="page">
      <NavBar backIcon={null} right={<MenuButton onClick={onMenu} />}>
        {t('app.name')}
      </NavBar>

      <div className="home-wrap">
        <p className="home-tagline">{t('app.tagline')}</p>

        <div className="home-actions">
          {ENTRIES.map(({ screen }) => (
            <Button
              key={screen}
              block
              color="primary"
              size="large"
              onClick={() => onNavigate(screen)}
            >
              {t(`nav.${screen}`)}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
