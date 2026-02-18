# conoha-ctrl-pnl

ConoHa VPS のサーバーを管理する Web コントロールパネルです。**VPS v2 (tyo1/tyo2/tyo3等) と v3 (c3j1/c3j2等) の両バージョン**に対応し、複数アカウント・複数リージョンのサーバーを一画面で一括管理できます。

サーバーの起動・停止・再起動、プラン変更（リサイズ）、セキュリティグループ管理、VNCコンソール接続、リソースモニタリング（CPU / ディスクIO / ネットワーク）を操作できます。

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

`config/v2/` および `config/v3/` ディレクトリに、ConoHa API の認証情報を JSON ファイルとして配置します。ファイル名は任意（`.json` 拡張子）で、各ディレクトリに複数ファイルを置くことで複数アカウントに対応できます。

```bash
# v2 (tyo1/tyo2/tyo3/sjc1/sin1)
cp config/v2/example.json.example config/v2/tyo3.json

# v3 (c3j1/c3j2)
cp config/v3/example.json.example config/v3/c3j1.json
```

各ファイルの形式:

```json
{
  "apiUser": "gncu12345678",
  "apiPassword": "your-api-password",
  "tenantId": "your-tenant-id",
  "region": "tyo3"
}
```

> **Note:** `config/v2/*.json` と `config/v3/*.json` は `.gitignore` で除外されています。

### 3. 開発サーバ起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 にアクセスします。

---

## Features

### マルチアカウント・マルチバージョン対応
- ConoHa VPS v2 / v3 両方の API に対応
- 各バージョンで複数リージョン・複数アカウントをサポート
- 全アカウントのサーバーをリージョン別にグルーピング表示（VPS V2/V3 バッジ付き）
- 一部アカウントの障害が全体に波及しない設計（`Promise.allSettled`）

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

### ダークモード
- ページタイトル横のトグルボタンで切替
- localStorage に保存し、次回アクセス時に自動適用
- グラフページ含む全画面対応

---

## Scripts

| Command         | Description                              |
| --------------- | ---------------------------------------- |
| `npm run dev`   | 開発サーバ起動（`next dev --turbopack`） |
| `npm run build` | プロダクションビルド（`next build`）     |
| `npm run start` | ビルド成果物の起動（`next start`）       |
| `npm run lint`  | ESLint 実行                              |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                        # メインページ
│   ├── layout.tsx                      # ルートレイアウト（ダークモード初期化）
│   ├── globals.css                     # グローバルCSS（ダークモード設定）
│   ├── graphs/[id]/page.tsx            # グラフ表示ページ
│   └── api/conoha/
│       ├── servers/route.ts            # サーバー一覧（全アカウント集約）
│       ├── flavors/route.ts            # フレーバー一覧（全アカウント集約）
│       ├── security-groups/route.ts    # セキュリティグループ一覧（全アカウント集約）
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
│   ├── ServerList.tsx                  # サーバー一覧（リージョン別グルーピング）
│   ├── ServerCard.tsx                  # サーバーカード（アカウントバッジ付き）
│   ├── StatusBadge.tsx                 # ステータスバッジ
│   └── ThemeToggle.tsx                 # ダークモードトグル
├── lib/
│   ├── conoha-client.ts               # ConoHa API クライアント（v2/v3対応クラス）
│   └── config.ts                      # マルチアカウント設定・エンドポイント管理
config/
├── v2/                                # VPS v2 認証情報（*.json, git管理外）
│   └── example.json.example
└── v3/                                # VPS v3 認証情報（*.json, git管理外）
    └── example.json.example
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

This project is licensed under the [Apache License 2.0](./LICENSE).
