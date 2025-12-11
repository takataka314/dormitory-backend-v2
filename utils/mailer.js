const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",  // 必要に応じて変更
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  }
});

async function sendReturnReminder(to, subject, html) {
  return transporter.sendMail({
    from: process.env.MAIL_USER,
    to,
    subject,
    html
  });
}

module.exports = { sendReturnReminder };
