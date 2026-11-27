import PlaceholderPage from '../../components/PlaceholderPage';

// 页面 A：先跑通导航，之后在 PlaceholderPage 的位置换成真实内容
export default function PageA({ onMenu, onBack }) {
  return <PlaceholderPage titleKey="nav.pageA" onMenu={onMenu} onBack={onBack} />;
}
