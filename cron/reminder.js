const cron = require("node-cron");
const Loan = require("../models/Loan");
const User = require("../models/User");
const { sendReturnReminder } = require("../utils/mailer");
const { returnReminderTemplate } = require("../utils/templates");

cron.schedule("0 9 * * *", async () => {  // 毎日 9:00
  console.log("[Cron] 返却リマインド開始");

  const now = new Date();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // 返却期限オーバー
  const loans = await Loan.find({
    returned: false,
    dueDate: { $lt: now },
    $or: [
      { reminderSent: false },                // まだ一度も送ってない
      { lastReminderDate: { $lt: sevenDaysAgo } } // 7日経過したら再送
    ]
  });

  for (const loan of loans) {
    const user = await User.findById(loan.userId);
    if (!user) continue;

    const html = returnReminderTemplate(
      user.name,
      loan.items,
      loan.dueDate.toLocaleDateString("ja-JP"),
      loan.staffName
    );

    try {
      await sendReturnReminder(
        user.email,
        "【返却のお願い】貸出期限が過ぎています",
        html
      );

      // 状態の更新
      loan.reminderSent = true;
      loan.lastReminderDate = new Date();
      await loan.save();

      console.log("送信成功:", user.email);
    } catch (err) {
      console.error("送信失敗:", user.email, err);
    }
  }

  console.log("[Cron] 返却リマインド終了");
});
