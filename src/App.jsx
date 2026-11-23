import { useState } from 'react';
import HomeScreen from './views/Home/Home';
import ReportScreen from './views/Report/Report';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [data, setData] = useState(null);

  return screen === 'home' ? (
    <HomeScreen
      onSubmit={(d) => {
        setData(d);
        setScreen('report');
      }}
    />
  ) : (
    <ReportScreen data={data} onBack={() => setScreen('home')} />
  );
}