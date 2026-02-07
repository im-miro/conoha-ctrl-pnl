# conoha-ctrl-pnl

ConoHa 向けのコントロールパネル（Web UI）プロジェクトです。

- Framework: Next.js (App Router)
- Runtime: React 19
- Styling: Tailwind CSS v4
- Data Fetching: SWR

> TODO: ここに「何を管理する画面か」「対象ユーザー」「主要機能」を1〜3行で追記してください。

---

## Requirements

- Node.js 20+（推奨）
- npm / yarn / pnpm / bun のいずれか

---

## Getting Started

依存関係のインストール:

```bash
npm install
# or
yarn
# or
pnpm install
# or
bun install
```

開発サーバ起動（Turbopack）:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

ブラウザでアクセス:

- http://localhost:3000

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

Next.js App Router 構成です。

- `app/` : ルーティングとページ/UI（例: `app/page.tsx`）
- `public/` : 静的ファイル

> TODO: 実際のディレクトリ構成（components/, lib/, services/ など）があるならここに追記します。

---

## Environment Variables

現時点では `.env` の定義が未提示のため、必要になりそうな雛形だけ置いてあります。

`.env.local` を作成し、必要に応じて追記してください。

```bash
# 例）バックエンドAPIを叩く場合
NEXT_PUBLIC_API_BASE_URL=http://localhost:xxxx
```

> TODO: 実際に参照している環境変数があれば `.env.example` を作り、この項目を確定させるのがおすすめです。

---

## Tech Stack

- Next.js 15 (Turbopack)
- React 19
- TypeScript
- Tailwind CSS v4
- SWR

---

## Lint / Formatting

- ESLint: `npm run lint`

> TODO: formatter（Prettier 等）を導入している場合はここに追記。

---

## Deployment

一般的な Next.js アプリとしてデプロイできます。

- Vercel
- Node.js サーバ（`npm run build` → `npm run start`）
- コンテナ化（必要なら Dockerfile 追加）

> TODO: 実際のデプロイ先・手順（社内基盤/CI/CD/環境変数/ビルド方式）に合わせて確定させます。

---

## License

TBD
