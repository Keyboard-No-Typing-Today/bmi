import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

const DB_NAME = 'bmi';
const TABLE = 'bmi_records';
const LS_KEY = 'bmi:records';           // 浏览器调试用的降级存储
const isNative = Capacitor.isNativePlatform();

let dbPromise = null;

/** 本地日期 YYYY-MM-DD（不能用 toISOString，那是 UTC，晚上会跨天） */
export function todayStr(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

async function getDb() {
  if (!isNative) return null;
  if (!dbPromise) {
    dbPromise = (async () => {
      const sqlite = new SQLiteConnection(CapacitorSQLite);
      const exist = await sqlite.isConnection(DB_NAME, false);
      const db = exist.result
        ? await sqlite.retrieveConnection(DB_NAME, false)
        : await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
      await db.open();
      await db.execute(
        'CREATE TABLE IF NOT EXISTS ' + TABLE + ' (' +
        ' id INTEGER PRIMARY KEY AUTOINCREMENT,' +
        ' date TEXT NOT NULL UNIQUE,' +          // 一天一条
        ' bmi REAL NOT NULL,' +
        ' weight REAL, height REAL, age INTEGER, gender TEXT, category TEXT,' +
        ' updated_at TEXT NOT NULL' +
        ');'
      );
      return db;
    })();
  }
  return dbPromise;
}

function webList() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || [];
  } catch {
    return [];
  }
}

/**
 * 保存一条记录。同一天已有记录时用 UPSERT 覆盖（只保留最新一条）。
 */
export async function saveRecord({ bmi, weight, height, age, gender, category }) {
  const date = todayStr();
  const updated_at = new Date().toISOString();
  const row = { date, bmi, weight, height, age, gender, category, updated_at };

  if (isNative) {
    const db = await getDb();
    await db.run(
      'INSERT INTO ' + TABLE +
      ' (date, bmi, weight, height, age, gender, category, updated_at)' +
      ' VALUES (?, ?, ?, ?, ?, ?, ?, ?)' +
      ' ON CONFLICT(date) DO UPDATE SET' +
      '  bmi = excluded.bmi, weight = excluded.weight, height = excluded.height,' +
      '  age = excluded.age, gender = excluded.gender, category = excluded.category,' +
      '  updated_at = excluded.updated_at;',
      [row.date, row.bmi, row.weight, row.height, row.age, row.gender, row.category, row.updated_at]
    );
    return;
  }

  const list = webList();
  const i = list.findIndex((x) => x.date === date);
  if (i >= 0) list[i] = row;
  else list.push(row);
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

/** 全部记录，按日期升序（图表从左到右就是时间顺序） */
export async function listRecords() {
  if (isNative) {
    const db = await getDb();
    const res = await db.query('SELECT * FROM ' + TABLE + ' ORDER BY date ASC;');
    return res.values || [];
  }
  return webList().sort((a, b) => String(a.date).localeCompare(String(b.date)));
}
