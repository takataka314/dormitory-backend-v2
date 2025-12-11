const express = require("express");
const router = express.Router();
const Loan = require("../models/Loan");

// 返却期限更新
router.post("/update_due", async (req, res) => {
  const { loanId, dueDate } = req.body;

  try {
    await Loan.findByIdAndUpdate(loanId, { dueDate: new Date(dueDate) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "更新エラー" });
  }
});

module.exports = router;
