const readme = `# 貸出管理システム (Node.js + SQLite)


## 必要な環境
- Node.js 18+ 推奨


## 簡単セットアップ
1. このフォルダで
npm install express better-sqlite3 better-sqlite3-session-store body-parser express-session joi node-cron nodemailer axios dotenv
2. 環境変数を設定（.env ファイルを作成）


例 .env:
```
PORT=3000
DB_FILE=data.db
SESSION_SECRET=任意の長い文字列
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your@example.com
SMTP_PASS=メールパスワード
SMTP_FROM=your@example.com
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxxxx
STAFF_SETUP_KEY=初回スタッフ作成用の秘密キー
```


3. 初回スタッフを作る（1回だけ）
curl -X POST http://localhost:3000/api/setup_staff -H 'Content-Type: application/json' -d '{"key":"<STAFF_SETUP_KEY>","name":"スタッフ名","email":"staff@example.com","pin":"1234"}'


4. サーバ起動
node server.js


5. iPad などから http://<サーバーIP>:3000/ を開く


## メモ
- パスワード(PIN)は 4 桁数字のみ許可、ハッシュ化して保存します。
- 返却期限はスタッフが `/api/staff/settings/due_days` で変更できます。
- 返却リマインドは cron ジョブで毎日 02:00 にチェックし、期限切れから7日経過した貸出に対してメールと Discord 通知を送ります。
- 物品の一括追加は `/api/staff/items/bulk` に配列で JSON を POST してください。


`;
fs.writeFileSync(path.join(__dirname, 'README.md'), readme);


console.log('Public files and README generated.');