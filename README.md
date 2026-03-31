# 夢のマンション — Vercelデプロイ手順

## 手順

### 1. このフォルダをGitHubにアップ

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/あなたのユーザー名/dream-apartment.git
git push -u origin main
```

### 2. Vercelでデプロイ

1. https://vercel.com にアクセス
2. GitHubアカウントでログイン
3. 「Add New Project」→ dream-apartmentリポジトリを選択
4. フレームワークは「Create React App」を選択
5. 「Deploy」ボタンを押す

以上で完了。数分でURLが発行される。

---

## ローカルで動かす場合

```bash
npm install
npm start
```
