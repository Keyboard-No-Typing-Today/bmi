import { useEffect, useMemo, useState } from 'react';
import { NavBar, Empty } from 'antd-mobile';
import { useTranslation } from 'react-i18next';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { listRecords } from '../../storage/history';
import MenuButton from '../../components/MenuButton';

// 和结果页色带同一套颜色
const COLORS = {
  severeUnder: '#ff3141', under: '#1677ff', normal: '#00b578',
  over: '#ff8f1f', obese: '#ed6a0c', severeOver: '#ff3141',
};

export default function HistoryScreen({ onBack, onMenu }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState(null); // null = 加载中

  useEffect(() => {
    let alive = true;
    listRecords()
      .then((r) => alive && setRows(r))
      .catch(() => alive && setRows([]));
    return () => { alive = false; };
  }, []);

  // 图表数据：日期只显示 MM-DD，tooltip 里再显示完整日期
  const data = useMemo(
    () =>
      (rows || []).map((r) => ({
        date: String(r.date).slice(5),
        fullDate: r.date,
        bmi: Number(r.bmi),
        category: r.category,
      })),
    [rows]
  );

  return (
    <div className="page">
      <NavBar onBack={onBack} right={<MenuButton onClick={onMenu} />}>
        {t('history.title')}
      </NavBar>

      {rows === null && <div className="history-hint">{t('history.loading')}</div>}

      {rows !== null && rows.length === 0 && (
        <div style={{ paddingTop: 60 }}>
          <Empty description={t('history.empty')} />
        </div>
      )}

      {rows !== null && rows.length > 0 && (
        <div className="history-wrap">
          {/* 折线图 */}
          <div className="card chart-card">
            <div className="chart-title">{t('history.chartTitle')}</div>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 16, bottom: 4, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8f8f8f' }} tickMargin={6} />
                  <YAxis tick={{ fontSize: 11, fill: '#8f8f8f' }} domain={['auto', 'auto']} />
                  <Tooltip
                    labelFormatter={(_label, payload) =>
                      payload && payload[0] ? payload[0].payload.fullDate : _label
                    }
                    formatter={(value, _name, item) => [
                      value + '  ' + t('cat.' + item.payload.category),
                      'BMI',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="bmi"
                    stroke="#1677ff"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#1677ff' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 记录列表：最新在上 */}
          <div className="card list-card">
            <div className="chart-title">{t('history.listTitle')}</div>
            {data.slice().reverse().map((r) => (
              <div className="record-row" key={r.fullDate}>
                <span className="record-date">{r.fullDate}</span>
                <span className="record-bmi" style={{ color: COLORS[r.category] || '#1f2328' }}>
                  {r.bmi.toFixed(2)}
                </span>
                <span className="record-cat" style={{ color: COLORS[r.category] || '#8f8f8f' }}>
                  {t('cat.' + r.category)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
