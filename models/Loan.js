const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [
    {
      name: String,
      count: Number
    }
  ],
  lendDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },      // 返却期限
  returned: { type: Boolean, default: false },
  reminderSent: { type: Boolean, default: false },  // 初回送信済
  lastReminderDate: { type: Date, default: null },  // 再送用
  staffName: String
});

module.exports = mongoose.model("Loan", loanSchema);
