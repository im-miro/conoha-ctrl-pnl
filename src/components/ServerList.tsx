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

  async function handleAction(serverId: string, action: ServerAction) {
    if (data?.servers) {
      const optimisticServers = data.servers.map((s) =>
        s.id === serverId ? { ...s, status: "processing" } : s
      );
      mutate({ servers: optimisticServers }, false);
    }

    const res = await fetch(`/api/conoha/servers/${serverId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    if (!res.ok) {
      const body = await res.json();
      alert(`操作に失敗しました: ${body.error || "不明なエラー"}`);
    }

    setTimeout(() => mutate(), 2000);
  }

  async function handleConsole(serverId: string) {
    const res = await fetch(`/api/conoha/servers/${serverId}/console`, {
      method: "POST",
    });

    if (!res.ok) {
      const body = await res.json();
      alert(`コンソールURL取得に失敗しました: ${body.error || "不明なエラー"}`);
      return;
    }

    const { url } = await res.json();
    window.open(url, "_blank");
  }

  async function handleAddSG(serverId: string, sgId: string) {
    const res = await fetch(`/api/conoha/servers/${serverId}/security-groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sgId }),
    });

    if (!res.ok) {
      const body = await res.json();
      alert(`セキュリティグループ追加に失敗しました: ${body.error || "不明なエラー"}`);
      return;
    }

    mutate();
  }

  async function handleRemoveSG(serverId: string, sgId: string) {
    const res = await fetch(`/api/conoha/servers/${serverId}/security-groups`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sgId }),
    });

    if (!res.ok) {
      const body = await res.json();
      alert(`セキュリティグループ削除に失敗しました: ${body.error || "不明なエラー"}`);
      return;
    }

    mutate();
  }

  async function handleResize(serverId: string, flavorId: string) {
    const res = await fetch(`/api/conoha/servers/${serverId}/resize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flavorId }),
    });

    if (!res.ok) {
      const body = await res.json();
      alert(`プラン変更に失敗しました: ${body.error || "不明なエラー"}`);
      return;
    }

    setTimeout(() => mutate(), 2000);
  }

  async function handleConfirmResize(serverId: string) {
    const res = await fetch(`/api/conoha/servers/${serverId}/resize-confirm`, {
      method: "POST",
    });

    if (!res.ok) {
      const body = await res.json();
      alert(`リサイズ確認に失敗しました: ${body.error || "不明なエラー"}`);
      return;
    }

    setTimeout(() => mutate(), 2000);
  }

  async function handleRevertResize(serverId: string) {
    const res = await fetch(`/api/conoha/servers/${serverId}/resize-confirm`, {
      method: "DELETE",
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
        <div className="flex items-center gap-3 text-gray-500">
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
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-800 font-medium">エラーが発生しました</p>
        <p className="mt-1 text-sm text-red-600">
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
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-10 text-center">
        <p className="text-gray-500">サーバーが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.servers.map((server) => (
        <ServerCard
          key={server.id}
          server={server}
          allSecurityGroups={allSGs}
          flavors={allFlavors}
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
  );
}
