// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

admin.initializeApp(); // デフォルトアプリ（Firestoreにアクセス）

const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- シンプルな認可ミドルウェア（プレースホルダ） ---
// 今はクライアントからヘッダで渡す想定（x-user-id, x-is-staff）。
// 本番は Firebase Auth に置き換えてください。
function requireLogin(req, res, next) {
  const uid = req.header("x-user-id");
  if (!uid) return res.status(401).json({ error: "ログインが必要です (ヘッダ x-user-id)" });
  req.user = { id: uid, is_staff: req.header("x-is-staff") === "1" };
  next();
}
function requireStaff(req, res, next) {
  if (!req.user || !req.user.is_staff) return res.status(403).json({ error: "スタッフ専用" });
  next();
}

// ルート読み込み（routes/loans.js を CommonJS 形式で作成します）
const loansRouter = require("./routes/loans");
app.use("/api/loans", loansRouter(db, requireLogin, requireStaff)); // pass db and middleware

// 簡単な /api/ping
app.get("/api/ping", (req, res) => res.json({ ok: true }));

exports.api = functions.region("asia-northeast1").https.onRequest(app);
