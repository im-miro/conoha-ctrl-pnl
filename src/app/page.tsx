import ServerList from "@/components/ServerList";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            ConoHa VPS コントロールパネル
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            サーバーのステータス確認と操作
          </p>
        </div>
        <ThemeToggle />
      </div>
      <ServerList />
    </main>
  );
}
