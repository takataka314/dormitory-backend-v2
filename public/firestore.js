// firestore.js
import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 追加
export async function addLog(data) {
  await addDoc(collection(db, "printLogs"), {
    ...data,
    createdAt: serverTimestamp()
  });
}

// 取得
export async function getLogs() {
  const q = query(
    collection(db, "printLogs"),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    /* ========= 共通関数 ========= */
    function isSignedIn() {
      return request.auth != null;
    }

    function isStaff() {
      return isSignedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid))
          .data.role == "staff";
    }

    /* ========= users ========= */
    match /users/{uid} {
      // ログインユーザーは全ユーザー情報を読める（名前選択用）
      allow read: if isSignedIn();

      // 自分自身のみ作成・更新可
      allow create, update: if
        isSignedIn() && request.auth.uid == uid;

      // 削除は禁止（事故防止）
      allow delete: if false;
    }

    /* ========= items（物品） ========= */
    match /items/{itemId} {
      // ログインユーザーなら閲覧可
      allow read: if isSignedIn();

      // 追加・編集・削除はスタッフのみ
      allow create, update, delete: if isStaff();
    }

    /* ========= lenders（〇執対応者） ========= */
    match /lenders/{lenderId} {
      // ログインユーザーなら閲覧可
      allow read: if isSignedIn();

      // CSV登録・編集・削除はスタッフのみ
      allow create, update, delete: if isStaff();
    }

    /* ========= loans（貸出履歴） ========= */
    match /loans/{loanId} {
      // ログインユーザーなら閲覧可
      allow read: if isSignedIn();

      // 貸出登録・返却処理はスタッフのみ
      allow create, update: if isStaff();

      // 削除は禁止（履歴保全）
      allow delete: if false;
    }

    /* ========= その他すべて拒否 ========= */
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
