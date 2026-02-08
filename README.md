# conoha-ctrl-pnl

ConoHa VPS のサーバーを管理する Web コントロールパネルです。サーバーの起動・停止・再起動、プラン変更（リサイズ）、セキュリティグループ管理、VNCコンソール接続、リソースモニタリング（CPU / ディスクIO / ネットワーク）を一画面で操作できます。

- Framework: Next.js (App Router)
- Runtime: React 19
- Styling: Tailwind CSS v4
- Data Fetching: SWR
- Charts: Recharts

---

## Requirements

- Node.js 20+
- npm

---

## Getting Started

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 認証情報の設定

`config/conoha-credentials.example.json` をコピーして `config/conoha-credentials.json` を作成し、ConoHa API の認証情報を記入します。

```bash
cp config/conoha-credentials.example.json config/conoha-credentials.json
```

```json
{
  "apiUser": "gncu12345678",
  "apiPassword": "your-api-password",
  "tenantId": "your-tenant-id",
  "region": "tyo3"
}
```

### 3. 開発サーバ起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 にアクセスします。

---

## Features

### サーバー管理
- サーバー一覧表示（ステータス、スペック、IPアドレス、ホスト情報）
- 起動 / 停止 / 再起動 / 強制停止
- VNC コンソール接続

### プラン変更（リサイズ）
- 停止中のサーバーのフレーバーを変更
- リサイズ後の確認 / 取消操作

### セキュリティグループ
- サーバーに紐づくセキュリティグループの確認・追加・削除

### リソースモニタリング（`/graphs/[id]`）
- CPU 使用率（エリアチャート）
- ディスク I/O - Read / Write（ラインチャート）
- ネットワークトラフィック - RX / TX（ラインチャート）
- 期間選択: 1時間 / 6時間 / 24時間 / 7日

---

## Scripts

| Command         | Description                                      |
| --------------- | ------------------------------------------------ |
| `npm run dev`   | 開発サーバ起動（`next dev --turbopack`）         |
| `npm run build` | プロダクションビルド（`next build --turbopack`） |
| `npm run start` | ビルド成果物の起動（`next start`）               |
| `npm run lint`  | ESLint 実行                                      |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                        # メインページ
│   ├── graphs/[id]/page.tsx            # グラフ表示ページ
│   └── api/conoha/
│       ├── servers/route.ts            # サーバー一覧
│       ├── flavors/route.ts            # フレーバー一覧
│       ├── security-groups/route.ts    # セキュリティグループ一覧
│       └── servers/[id]/
│           ├── action/route.ts         # 起動/停止/再起動
│           ├── console/route.ts        # VNCコンソール
│           ├── resize/route.ts         # リサイズ実行
│           ├── resize-confirm/route.ts # リサイズ確認/取消
│           ├── security-groups/route.ts
│           └── graphs/
│               ├── cpu/route.ts        # CPUグラフデータ
│               ├── disk/route.ts       # ディスクIOグラフデータ
│               └── network/route.ts    # ネットワークグラフデータ
├── components/
│   ├── ServerList.tsx                  # サーバー一覧コンポーネント
│   ├── ServerCard.tsx                  # サーバーカード
│   └── StatusBadge.tsx                 # ステータスバッジ
├── lib/
│   ├── conoha-client.ts               # ConoHa API クライアント
│   └── config.ts                      # 認証情報・エンドポイント設定
config/
└── conoha-credentials.json            # API認証情報（git管理外）
```

---

## Tech Stack

- Next.js 15 (Turbopack)
- React 19
- TypeScript
- Tailwind CSS v4
- SWR
- Recharts

---

## License

TBD
