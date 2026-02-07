import ServerList from "@/components/ServerList";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          ConoHa VPS コントロールパネル
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          サーバーのステータス確認と操作
        </p>
      </div>
      <ServerList />
    </main>
  );
}
