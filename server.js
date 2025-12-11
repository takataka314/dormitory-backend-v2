//---------------------------------------------------------
// 必要ライブラリ（すべて import に統一）
//---------------------------------------------------------
import express from "express";
import session from "express-session";
import connectSqlite3 from "connect-sqlite3";
import path from "path";
import crypto from "crypto";
import Database from "better-sqlite3";
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";
import iconv from "iconv-lite";
import { Readable } from "stream";
const SQLiteStore = connectSqlite3(session);


const upload = multer({ dest: "uploads/" });

const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//---------------------------------------------------------
// セッション
//---------------------------------------------------------
app.use(
  session({
    secret: "lend-secret",
    resave: false,
    saveUninitialized: false,
    store: new SQLiteStore({
      db: "sessions.sqlite",
    }),
    cookie: { maxAge: 24 * 60 * 60 * 1000 },
  })
);

//---------------------------------------------------------
// DB 初期化
//---------------------------------------------------------
const db = new Database("database.sqlite");

function hashPin(pin) {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    pin TEXT NOT NULL,
    is_staff INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT,
    name TEXT,
    total_qty INTEGER DEFAULT 1,
    note TEXT
  );

  CREATE TABLE IF NOT EXISTS lenders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    lender_id INTEGER NOT NULL,
    qty INTEGER NOT NULL,
    room TEXT NOT NULL,
    staff_id INTEGER,
    borrowed_at TEXT DEFAULT CURRENT_TIMESTAMP,
    returned_at TEXT,

    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (lender_id) REFERENCES lenders(id),
    FOREIGN KEY (staff_id) REFERENCES users(id)
  );
`);
// --- 初期スタッフ登録（1回だけ動く） ---
function initDefaultStaff() {
  const defaultStaff = [
    { name: "marusitsu", email: "keiteki326sikkou@gmail.com", pin: "0000" },
  ];

  const insert = db.prepare(`
    INSERT INTO users (name, email, pin, is_staff)
    VALUES (?, ?, ?, 1)
  `);

  defaultStaff.forEach(staff => {
    const exists = db.prepare("SELECT id FROM users WHERE name=?").get(staff.name);

    if (!exists) {
      insert.run(staff.name, staff.email, hashPin(staff.pin));
      console.log(`✔ 初期スタッフを登録しました: ${staff.name}`);
    }
  });
}

// 実行
initDefaultStaff();

//---------------------------------------------------------
// ミドルウェア
//---------------------------------------------------------
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "ログインが必要です" });
  }
  next();
}

function requireStaff(req, res, next) {
  if (!req.session.isStaff) {
    return res.status(403).json({ error: "スタッフ専用です" });
  }
  next();
}

//---------------------------------------------------------
// 静的ファイル
//---------------------------------------------------------
app.use(express.static("public"));

app.get("/api/me", requireLogin, (req, res) => {
  const user = db.prepare(`
    SELECT id, name, is_staff 
    FROM users 
    WHERE id=?
  `).get(req.session.userId);

  res.json({ 
    id: user.id,
    name: user.name,
    is_staff: user.is_staff === 1
  });
});

app.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: "ログアウト失敗" });
    }
    res.json({ ok: true });
  });
});

//---------------------------------------------------------
// API: ログイン名一覧
//---------------------------------------------------------
app.get("/api/login-names", (req, res) => {
  const users = db.prepare("SELECT id, name, is_staff FROM users").all();

  res.json({
    names: users.map((u) => ({
      id: u.id,
      name: u.name,
      type: u.is_staff ? "staff" : "user",
    })),
  });
});

//---------------------------------------------------------
// API: ログイン処理
//---------------------------------------------------------
app.post("/api/login", (req, res) => {
  const { name, pin } = req.body;

  // name には実は "ユーザーID" が入ってくる
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(name);

  if (!user || user.pin !== hashPin(pin)) {
    return res.status(401).json({ error: "ユーザー名かPINが違います" });
  }

  req.session.userId = user.id;
  req.session.isStaff = user.is_staff === 1;

  res.json({ ok: true, role: user.is_staff ? "staff" : "user" });
});

//---------------------------------------------------------
// API: 新規登録（一般ユーザー）
//---------------------------------------------------------
app.post("/api/register", (req, res) => {
  const { name, email, pin } = req.body;

  const hashed = hashPin(pin);

  db.prepare("INSERT INTO users(name, email, pin, is_staff) VALUES (?, ?, ?, 0)")
    .run(name, email, hashed);

  res.json({ ok: true });
});

//---------------------------------------------------------
// API: スタッフ作成用（初回セットアップ）
//---------------------------------------------------------
app.post("/api/setup_staff", (req, res) => {
  const { name, email, pin } = req.body;

  const hashed = hashPin(pin);

  db.prepare("INSERT INTO users(name, email, pin, is_staff) VALUES (?, ?, ?, 1)")
    .run(name, email, hashed);

  res.json({ ok: true });
});

//---------------------------------------------------------
// API: 物品一覧
//---------------------------------------------------------
app.get("/api/items", requireLogin, (req, res) => {
  const items = db.prepare(`
    SELECT 
      i.*,
      (i.total_qty - IFNULL((SELECT SUM(qty) FROM loans WHERE item_id=i.id AND returned_at IS NULL), 0)) AS available
    FROM items i
  `).all();

  res.json({ items });
});

//---------------------------------------------------------
// API: 物品追加
//---------------------------------------------------------
app.post("/api/items/bulk",requireLogin,requireStaff, (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.json({ ok: false, error: "無効なデータ" });
  }

  const stmt = db.prepare(`
    INSERT INTO items (category, name, total_qty)
    VALUES (?, ?, ?)
  `);

  const insertMany = db.transaction((rows) => {
    rows.forEach(row => {
      stmt.run(row.category, row.name, Number(row.qty));
    });
  });

  try {
    insertMany(items);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.json({ ok: false, error: "DB登録に失敗しました" });
  }
});

//---------------------------------------------------------
// API: 複数物品更新
//---------------------------------------------------------
app.post("/api/items/update-bulk", requireLogin, requireStaff, (req, res) => {
  const { updates } = req.body;
  if (!Array.isArray(updates)) return res.json({ ok: false, error: "無効なデータ" });

  const stmt = db.prepare("UPDATE items SET total_qty = ?, note = ? WHERE id = ?");
  const transaction = db.transaction((rows) => {
    rows.forEach(r => stmt.run(r.total_qty, r.note, r.id));
  });

  try {
    transaction(updates);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.json({ ok: false, error: e.message });
  }
});

// -----------------------------
// 物品一覧取得
// -----------------------------
app.get("/api/items", requireLogin, (req, res) => {
  const items = db.prepare("SELECT * FROM items ORDER BY category, name").all();
  res.json({ items });
});

// -----------------------------
// 在庫更新
// -----------------------------
app.post("/api/items/update_qty", requireLogin, requireStaff, (req, res) => {
  const { id, delta } = req.body;
  const item = db.prepare("SELECT total_qty FROM items WHERE id=?").get(id);
  if (!item) return res.json({ ok: false, error: "物品が存在しません" });

  const newQty = Math.max(0, item.total_qty + delta);
  db.prepare("UPDATE items SET total_qty=? WHERE id=?").run(newQty, id);
  res.json({ ok: true });
});

// -----------------------------
// 備考更新
// -----------------------------
app.post("/api/items/update_note", requireLogin, requireStaff, (req, res) => {
  const { id, note } = req.body;
  const item = db.prepare("SELECT id FROM items WHERE id=?").get(id);
  if (!item) return res.json({ ok: false, error: "物品が存在しません" });

  // items テーブルに note カラムがない場合は ALTER TABLE で追加する必要があります
  db.prepare("UPDATE items SET note=? WHERE id=?").run(note, id);
  res.json({ ok: true });
});

//---------------------------------------------------------
// API: 貸出
//---------------------------------------------------------
app.post("/api/loans", requireLogin, (req, res) => {
  const { item_id, lender_id, qty, room } = req.body;

  const available = db.prepare(`
    SELECT total_qty  - IFNULL(
      (SELECT SUM(qty) FROM loans WHERE item_id=? AND returned_at IS NULL), 0
    ) AS available
    FROM items
  `).get(item_id).available;

  if (available < qty) {
    return res.json({ error: "在庫不足です" });
  }

  const staffId = req.session.userId; // ← ここでセッションIDを使う

  db.prepare(`
    INSERT INTO loans(item_id, lender_id, qty, room, staff_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(item_id, lender_id, qty, room, staffId);

  res.json({ ok: true });
});

//---------------------------------------------------------
// API: 未返却一覧を取得
//---------------------------------------------------------
app.get("/api/loans/unreturned", requireLogin, (req, res) => {
  const rows = db.prepare(`
    SELECT 
      loans.id,
      loans.room,
      loans.qty,
      loans.borrowed_at,
      items.name AS itemName,
      lenders.name AS lenderName,
      users.name AS userName
    FROM loans
    JOIN items ON loans.item_id = items.id
    JOIN lenders ON loans.lender_id = lenders.id
    LEFT JOIN users ON loans.staff_id = users.id
    WHERE loans.returned_at IS NULL
    ORDER BY loans.borrowed_at ASC
  `).all();

  res.json({ loans: rows });
});

//---------------------------------------------------------
// API: 返却処理
//---------------------------------------------------------
app.post("/api/loans/return", requireLogin, (req, res) => {
  const { id } = req.body;

  db.prepare(`
    UPDATE loans
    SET returned_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(id);

  res.json({ ok: true });
});

// ---------------------------------------------------------
// API: 複数返却
// ---------------------------------------------------------
app.post("/api/loans/return/bulk", requireLogin, (req, res) => {
  const ids = req.body.ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.json({ error: "IDがありません" });
  }

  const stmt = db.prepare(`
    UPDATE loans SET returned_at = CURRENT_TIMESTAMP
    WHERE id = ? AND returned_at IS NULL
  `);

  const trx = db.transaction((ids) => {
    ids.forEach(id => stmt.run(id));
  });

  trx(ids);

  res.json({ ok: true });
});

//---------------------------------------------------------
// 全 lenders を返す
//---------------------------------------------------------
app.get("/api/lenders",requireLogin, (req, res) => {
  const lenders = db.prepare("SELECT * FROM lenders ORDER BY id DESC").all();
  res.json({ lenders });
});

// ---------------------------------------------------------
// API: 未返却の貸出履歴 + ソート + 検索
// ---------------------------------------------------------
app.get("/api/history", requireLogin,requireStaff, (req, res) => {
  const staffId = req.session.userId;
  const user = db.prepare("SELECT is_staff FROM users WHERE id=?").get(staffId);

  if (!user || user.is_staff !== 1) {
    return res.status(403).json({ error: "アクセス権がありません" });
  }

  const q = req.query.q ? `%${req.query.q}%` : `%`;
  const onlyNot = req.query.onlyNot === "1";  // 未返却のみ

  const rows = db.prepare(`
    SELECT 
      loans.id,
      items.name AS item_name,
      items.category,
      users.name AS lender_name,
      loans.qty,
      loans.room,
      loans.borrowed_at,
      loans.returned_at,
      lenders.name AS staff_name
    FROM loans
      JOIN items   ON loans.item_id   = items.id
      JOIN lenders ON loans.lender_id = lenders.id
      LEFT JOIN users ON loans.staff_id = users.id
    WHERE 
      (loans.room LIKE ? OR items.name LIKE ? OR lenders.name LIKE ?)
      ${onlyNot ? "AND loans.returned_at IS NULL" : ""}
    ORDER BY loans.room ASC, loans.borrowed_at DESC
  `).all(q, q, q);

  res.json(rows);
});

//---------------------------------------------------------
// CSVアップロード → lenders テーブルへ登録（Shift-JIS対応）
//---------------------------------------------------------

app.post("/api/lenders/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "CSVファイルを選択してください" });

  const fileBuffer = fs.readFileSync(req.file.path);

  // Shift-JIS → UTF-8 に変換
  const utf8Text = iconv.decode(fileBuffer, "Shift_JIS");

  // UTF-8 テキストをストリームとして csv-parser に渡す
  const stream = Readable.from(utf8Text);

  const results = [];

  stream
    .pipe(csv())
    .on("data", (row) => {
      if (row.name && row.name.trim() !== "") {
        results.push(row.name.trim());
      }
    })
    .on("end", () => {
      const stmt = db.prepare("INSERT INTO lenders (name) VALUES (?)");

      const insert = db.transaction((names) => {
        names.forEach((name) => stmt.run(name));
      });

      insert(results);

      fs.unlinkSync(req.file.path); // 一時ファイル削除

      res.json({ ok: true, count: results.length });
    })
    .on("error", (err) => {
      res.json({ ok: false, error: "CSV読み込みエラー: " + err.message });
    });
});


//---------------------------------------------------------
// サーバー起動
//---------------------------------------------------------
app.listen(3000, () => console.log("Server running on http://localhost:3000/login.html"));
