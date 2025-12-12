// functions/routes/loans.js
// module.exports = function(db, requireLogin, requireStaff) { return router; }
const express = require("express");

module.exports = function(db, requireLogin, requireStaff) {
  const router = express.Router();

  // ドキュメントIDで loan を更新（dueDate の更新）
  router.post("/update_due", requireLogin, requireStaff, async (req, res) => {
    try {
      const { loanId, dueDate } = req.body;
      if (!loanId || !dueDate) return res.status(400).json({ error: "loanId/dueDate 必須" });

      const loanRef = db.collection("loans").doc(String(loanId));
      await loanRef.update({ dueDate: admin.firestore.Timestamp.fromDate(new Date(dueDate)) });
      return res.json({ success: true });
    } catch (err) {
      console.error("update_due error:", err);
      return res.status(500).json({ error: "更新エラー" });
    }
  });

  // ---------------------------------------
  // loan 作成（貸出）
  // POST /api/loans/create  { item_id, lender_id, qty, room, staff_id(optional) }
  // ---------------------------------------
  router.post("/create", requireLogin, async (req, res) => {
    try {
      const { item_id, lender_id, qty, room, staff_id } = req.body;
      if (!item_id || !lender_id || !qty || !room) return res.status(400).json({ error: "必須フィールド不足" });

      const doc = {
        item_id,
        lender_id,
        qty: Number(qty),
        room,
        staff_id: staff_id || req.user.id || null,
        borrowed_at: admin.firestore.FieldValue.serverTimestamp(),
        returned_at: null
      };

      const docRef = await db.collection("loans").add(doc);
      return res.json({ ok: true, id: docRef.id });
    } catch (err) {
      console.error("create loan error:", err);
      return res.status(500).json({ error: "貸出作成に失敗" });
    }
  });

  // ---------------------------------------
  // 未返却一覧
  // GET /api/loans/unreturned
  // ---------------------------------------
  router.get("/unreturned", requireLogin, async (req, res) => {
    try {
      const snapshot = await db.collection("loans").where("returned_at", "==", null).orderBy("borrowed_at", "asc").get();
      const loans = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        loans.push(Object.assign({ id: doc.id }, data));
      });
      return res.json({ loans });
    } catch (err) {
      console.error("unreturned error:", err);
      return res.status(500).json({ error: "取得エラー" });
    }
  });

  // ---------------------------------------
  // 返却（単体）
  // POST /api/loans/return  { id }
  // ---------------------------------------
  router.post("/return", requireLogin, async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "id 必須" });
      await db.collection("loans").doc(String(id)).update({ returned_at: admin.firestore.FieldValue.serverTimestamp() });
      return res.json({ ok: true });
    } catch (err) {
      console.error("return error:", err);
      return res.status(500).json({ error: "返却処理失敗" });
    }
  });

  // ---------------------------------------
  // bulk 返却
  // POST /api/loans/return/bulk { ids: [id1,id2...] }
  // ---------------------------------------
  router.post("/return/bulk", requireLogin, async (req, res) => {
    try {
      const ids = req.body.ids;
      if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids 必須" });

      const batch = db.batch();
      ids.forEach(id => {
        const ref = db.collection("loans").doc(String(id));
        batch.update(ref, { returned_at: admin.firestore.FieldValue.serverTimestamp() });
      });
      await batch.commit();
      return res.json({ ok: true });
    } catch (err) {
      console.error("bulk return error:", err);
      return res.status(500).json({ error: "一括返却失敗" });
    }
  });

  // ---------------------------------------
  // 履歴取得（簡易：検索対応）
  // GET /api/loans/history?q=keyword&onlyNot=1
  // ---------------------------------------
  router.get("/history", requireLogin, requireStaff, async (req, res) => {
    try {
      const q = req.query.q || "";
      const onlyNot = req.query.onlyNot === "1";

      // Firestore で複雑検索する場合は設計が必要。ここでは簡易に全取得してフィルタ（※小規模向け）
      const snapshot = await db.collection("loans").orderBy("borrowed_at", "desc").limit(1000).get();
      let rows = [];
      snapshot.forEach(doc => {
        const d = Object.assign({ id: doc.id }, doc.data());
        rows.push(d);
      });

      if (onlyNot) rows = rows.filter(r => !r.returned_at);
      if (q) {
        const qlow = q.toLowerCase();
        rows = rows.filter(r =>
          (r.room && (""+r.room).toLowerCase().includes(qlow)) ||
          (r.item_id && (""+r.item_id).toLowerCase().includes(qlow)) ||
          (r.lender_id && (""+r.lender_id).toLowerCase().includes(qlow))
        );
      }

      return res.json(rows);
    } catch (err) {
      console.error("history error:", err);
      return res.status(500).json({ error: "取得失敗" });
    }
  });

  return router;
};
