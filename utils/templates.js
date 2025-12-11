exports.returnReminderTemplate = (userName, items, dueDate, staffName) => {
  const itemRows = items.map(i => `
    <tr>
      <td>${i.name}</td>
      <td>${i.count}</td>
    </tr>
  `).join("");

  return `
  <div style="font-family: sans-serif; padding: 20px;">
    <h2>【返却のお願い】</h2>
    <p>${userName} 様</p>
    <p>以下の物品の返却期限が過ぎています。恐れ入りますが、ご返却をお願いいたします。</p>

    <h3>■ 貸出物品</h3>
    <table border="1" cellspacing="0" cellpadding="6">
      <tr><th>物品</th><th>数量</th></tr>
      ${itemRows}
    </table>

    <p><b>返却期限：</b>${dueDate}</p>
    <p><b>貸出対応者：</b>${staffName}</p>

    <br>
    <p>よろしくお願いいたします。</p>
  </div>`;
};
