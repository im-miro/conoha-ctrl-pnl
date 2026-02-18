"use client";

import useSWR from "swr";
import ServerCard from "./ServerCard";
import type { Server, ServerAction, SecurityGroup, FlavorDetail } from "@/lib/conoha-client";

interface ServersResponse {
  servers: Server[];
  error?: string;
}

interface SGResponse {
  security_groups: SecurityGroup[];
  error?: string;
}

interface FlavorsResponse {
  flavors: FlavorDetail[];
  error?: string;
}

const fetcher = <T,>(url: string) =>
  fetch(url).then((res) => res.json()) as Promise<T>;

export default function ServerList() {
  const { data, error, isLoading, mutate } = useSWR<ServersResponse>(
    "/api/conoha/servers",
    fetcher<ServersResponse>,
    { refreshInterval: 3000 }
  );

  const { data: sgData } = useSWR<SGResponse>(
    "/api/conoha/security-groups",
    fetcher<SGResponse>,
    { refreshInterval: 30000 }
  );

  const { data: flavorData } = useSWR<FlavorsResponse>(
    "/api/conoha/flavors",
    fetcher<FlavorsResponse>,
    { refreshInterval: 60000 }
  );

  const allSGs = sgData?.security_groups ?? [];
  const allFlavors = flavorData?.flavors ?? [];

  async function handleAction(serverId: string, action: ServerAction, accountId: string) {
    if (data?.servers) {
      const optimisticServers = data.servers.map((s) =>
        s.id === serverId ? { ...s, status: "processing" } : s
      );
      mutate({ servers: optimisticServers }, false);
    }

    const res = await fetch(`/api/conoha/servers/${serverId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, accountId }),
    });

    if (!res.ok) {
      const body = await res.json();
      alert(`操作に失敗しました: ${body.error || "不明なエラー"}`);
    }

    setTimeout(() => mutate(), 2000);
  }

  async function handleConsole(serverId: string, accountId: string) {
    const res = await fetch(`/api/conoha/servers/${serverId}/console`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });

    if (!res.ok) {
      const body = await res.json();
      alert(`コンソールURL取得に失敗しました: ${body.error || "不明なエラー"}`);
      return;
    }

    const { url } = await res.json();
    window.open(url, "_blank");
  }

  async function handleAddSG(serverId: string, sgId: string, accountId: string) {
    const res = await fetch(`/api/conoha/servers/${serverId}/security-groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sgId, accountId }),
    });

    if (!res.ok) {
      const body = await res.json();
      alert(`セキュリティグループ追加に失敗しました: ${body.error || "不明なエラー"}`);
      return;
    }

    mutate();
  }

  async function handleRemoveSG(serverId: string, sgId: string, accountId: string) {
    const res = await fetch(`/api/conoha/servers/${serverId}/security-groups`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sgId, accountId }),
    });

    if (!res.ok) {
      const body = await res.json();
      alert(`セキュリティグループ削除に失敗しました: ${body.error || "不明なエラー"}`);
      return;
    }

    mutate();
  }

  async function handleResize(serverId: string, flavorId: string, accountId: string) {
    const res = await fetch(`/api/conoha/servers/${serverId}/resize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flavorId, accountId }),
    });

    if (!res.ok) {
      const body = await res.json();
      alert(`プラン変更に失敗しました: ${body.error || "不明なエラー"}`);
      return;
    }

    setTimeout(() => mutate(), 2000);
  }

  async function handleConfirmResize(serverId: string, accountId: string) {
    const res = await fetch(`/api/conoha/servers/${serverId}/resize-confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });

    if (!res.ok) {
      const body = await res.json();
      alert(`リサイズ確認に失敗しました: ${body.error || "不明なエラー"}`);
      return;
    }

    setTimeout(() => mutate(), 2000);
  }

  async function handleRevertResize(serverId: string, accountId: string) {
    const res = await fetch(`/api/conoha/servers/${serverId}/resize-confirm`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });

    if (!res.ok) {
      const body = await res.json();
      alert(`リサイズ取消に失敗しました: ${body.error || "不明なエラー"}`);
      return;
    }

    setTimeout(() => mutate(), 2000);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          サーバー一覧を取得中...
        </div>
      </div>
    );
  }

  if (error || data?.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950/50">
        <p className="text-red-800 font-medium dark:text-red-300">エラーが発生しました</p>
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {data?.error || "サーバーとの通信に失敗しました"}
        </p>
        <button
          onClick={() => mutate()}
          className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
        >
          再試行
        </button>
      </div>
    );
  }

  if (!data?.servers?.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-10 text-center dark:border-gray-700 dark:bg-gray-800">
        <p className="text-gray-500 dark:text-gray-400">サーバーが見つかりません</p>
      </div>
    );
  }

  const grouped = new Map<string, typeof data.servers>();
  for (const server of data.servers) {
    const key = server.accountId ?? "unknown";
    const list = grouped.get(key);
    if (list) list.push(server);
    else grouped.set(key, [server]);
  }

  return (
    <div className="space-y-8">
      {[...grouped.entries()].map(([accountId, servers]) => {
        const parts = accountId.split("-");
        const version = parts[0]?.toUpperCase();
        const region = parts.slice(1).join("-");
        const isV2 = version === "V2";

        return (
          <section key={accountId}>
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${
                  isV2
                    ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700"
                    : "bg-teal-50 text-teal-700 border-teal-300 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-700"
                }`}
              >
                VPS {version}
              </span>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{region}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">{servers.length} servers</span>
              <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {servers.map((server) => (
                <ServerCard
                  key={`${server.accountId}-${server.id}`}
                  server={server}
                  allSecurityGroups={allSGs.filter((sg) => sg.accountId === server.accountId)}
                  flavors={allFlavors.filter((f) => f.accountId === server.accountId)}
                  onAction={handleAction}
                  onConsole={handleConsole}
                  onAddSG={handleAddSG}
                  onRemoveSG={handleRemoveSG}
                  onResize={handleResize}
                  onConfirmResize={handleConfirmResize}
                  onRevertResize={handleRevertResize}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
