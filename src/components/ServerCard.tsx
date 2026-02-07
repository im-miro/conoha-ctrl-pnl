"use client";

import { useState } from "react";
import StatusBadge from "./StatusBadge";
import type { Server, ServerAction, SecurityGroup } from "@/lib/conoha-client";

interface ServerCardProps {
  server: Server;
  allSecurityGroups: SecurityGroup[];
  onAction: (serverId: string, action: ServerAction) => Promise<void>;
  onConsole: (serverId: string) => Promise<void>;
  onAddSG: (serverId: string, sgId: string) => Promise<void>;
  onRemoveSG: (serverId: string, sgId: string) => Promise<void>;
}

function getIpAddresses(
  addresses: Server["addresses"]
): { addr: string; version: number; mac?: string; type?: string }[] {
  const result: { addr: string; version: number; mac?: string; type?: string }[] = [];
  for (const network of Object.values(addresses)) {
    for (const addr of network) {
      result.push({
        addr: addr.addr,
        version: addr.version,
        mac: addr["OS-EXT-IPS-MAC:mac_addr"],
        type: addr["OS-EXT-IPS:type"],
      });
    }
  }
  return result;
}

function formatRam(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`;
  return `${mb} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

const POWER_STATE: Record<number, string> = {
  0: "No State",
  1: "Running",
  3: "Paused",
  4: "Shutdown",
  6: "Crashed",
  7: "Suspended",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="ml-1 rounded p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      title="コピー"
    >
      {copied ? (
        <svg className="h-3.5 w-3.5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
          <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
        </svg>
      )}
    </button>
  );
}

type BillingType = "hourly" | "monthly" | "reserved" | "unknown";

function detectBillingType(flavorName?: string): BillingType {
  if (!flavorName) return "unknown";
  const lower = flavorName.toLowerCase();
  // ConoHa flavor naming: g2l-t-... = 時間課金, g2l-m-... = まとめ払い(月額)
  if (/-t-/.test(lower) || /\.t\./.test(lower) || lower.includes("hourly")) return "hourly";
  if (/-m-/.test(lower) || /\.m\./.test(lower) || lower.includes("monthly")) return "monthly";
  if (/-r-/.test(lower) || /\.r\./.test(lower) || lower.includes("reserved")) return "reserved";
  return "unknown";
}

const BILLING_CONFIG: Record<BillingType, { label: string; className: string }> = {
  hourly: {
    label: "時間課金",
    className: "bg-cyan-100 text-cyan-800 border-cyan-300",
  },
  monthly: {
    label: "まとめ払い",
    className: "bg-purple-100 text-purple-800 border-purple-300",
  },
  reserved: {
    label: "リザーブド",
    className: "bg-orange-100 text-orange-800 border-orange-300",
  },
  unknown: {
    label: "",
    className: "",
  },
};

function BillingBadge({ flavor }: { flavor: Server["flavor"] }) {
  const name = flavor.name || flavor.original_name;
  const billing = detectBillingType(name);
  if (billing === "unknown") return null;
  const config = BILLING_CONFIG[billing];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-300 ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function DetailRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 py-0.5">
      <span className="text-gray-400 w-28 shrink-0 text-right">{label}</span>
      <span className={`text-gray-700 break-all ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

export default function ServerCard({
  server,
  allSecurityGroups,
  onAction,
  onConsole,
  onAddSG,
  onRemoveSG,
}: ServerCardProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [consoleLoading, setConsoleLoading] = useState(false);
  const [sgLoading, setSgLoading] = useState(false);
  const [sgOpen, setSgOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const isActive = server.status === "ACTIVE";
  const isShutoff = server.status === "SHUTOFF";
  const isTransitioning = !isActive && !isShutoff && server.status !== "ERROR";

  const ipAddresses = getIpAddresses(server.addresses);
  const host = server["OS-EXT-SRV-ATTR:host"] || server["OS-EXT-SRV-ATTR:hypervisor_hostname"];
  const { flavor } = server;
  const totalVolumeSizeGB = (server.volumes ?? []).reduce((sum, v) => sum + v.size, 0);
  const diskDisplay = flavor.disk ? flavor.disk : totalVolumeSizeGB || null;
  const currentSGNames = new Set((server.security_groups ?? []).map((sg) => sg.name));
  const currentSGs = allSecurityGroups.filter((sg) => currentSGNames.has(sg.name));
  const availableSGs = allSecurityGroups.filter((sg) => !currentSGNames.has(sg.name));

  async function handleAction(action: ServerAction) {
    setLoading(action);
    try {
      await onAction(server.id, action);
    } finally {
      setTimeout(() => setLoading(null), 3000);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md">
      {/* ヘッダー */}
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 truncate mr-3">
          {server.name}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0">
          <BillingBadge flavor={flavor} />
          <StatusBadge status={loading ? "processing" : server.status} />
        </div>
      </div>

      {/* スペック行 */}
      {(flavor.vcpus || flavor.ram || diskDisplay) ? (
        <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
          {flavor.vcpus && (
            <span className="inline-flex items-center gap-1">
              <svg className="h-3.5 w-3.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M13 7H7v6h6V7z" /><path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" /></svg>
              {flavor.vcpus} vCPU
            </span>
          )}
          {flavor.ram && (
            <span className="inline-flex items-center gap-1">
              <svg className="h-3.5 w-3.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v3H3V5zM3 10h14v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2zm2 1a1 1 0 100 2h1a1 1 0 100-2H5z" /></svg>
              {formatRam(flavor.ram)}
            </span>
          )}
          {diskDisplay && (
            <span className="inline-flex items-center gap-1">
              <svg className="h-3.5 w-3.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 11.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" /></svg>
              {diskDisplay} GB{!flavor.disk && totalVolumeSizeGB ? " (Volume)" : ""}
            </span>
          )}
        </div>
      ) : (
        <div className="mb-3" />
      )}

      {/* IP アドレス */}
      <div className="mb-3 space-y-1 text-sm text-gray-600">
        {ipAddresses.map((ip) => (
          <div key={ip.addr} className="flex items-center gap-2">
            <span className="text-gray-400 w-8 shrink-0">
              {ip.version === 4 ? "IPv4" : "IPv6"}
            </span>
            <code className="rounded bg-gray-50 px-1.5 py-0.5 text-xs font-mono">
              {ip.addr}
            </code>
            {ip.version === 4 && <CopyButton text={ip.addr} />}
          </div>
        ))}
      </div>

      {/* ホスト（網掛け外） */}
      {host && (
        <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
          <span className="text-gray-400">ホスト:</span>
          <span className="font-mono">{host}</span>
        </div>
      )}

      {/* セキュリティグループ */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-400">セキュリティグループ</span>
          <button
            onClick={() => setSgOpen(!sgOpen)}
            className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            {sgOpen ? "閉じる" : "編集"}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {currentSGs.length === 0 && (
            <span className="text-xs text-gray-400">なし</span>
          )}
          {currentSGs.map((sg) => (
            <span
              key={sg.id}
              className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs text-indigo-700"
            >
              {sg.name}
              {sgOpen && (
                <button
                  onClick={async () => {
                    setSgLoading(true);
                    try {
                      await onRemoveSG(server.id, sg.id);
                    } finally {
                      setSgLoading(false);
                    }
                  }}
                  disabled={sgLoading}
                  className="ml-0.5 text-indigo-400 hover:text-red-500 disabled:opacity-50 transition-colors"
                  title="削除"
                >
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </span>
          ))}
        </div>
        {sgOpen && availableSGs.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {availableSGs.map((sg) => (
              <button
                key={sg.id}
                onClick={async () => {
                  setSgLoading(true);
                  try {
                    await onAddSG(server.id, sg.id);
                  } finally {
                    setSgLoading(false);
                  }
                }}
                disabled={sgLoading}
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 transition-colors"
                title={sg.description || sg.name}
              >
                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                {sg.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 詳細情報（折りたたみ） */}
      <div className="mb-3">
        <button
          onClick={() => setDetailOpen(!detailOpen)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg
            className={`h-3.5 w-3.5 transition-transform duration-200 ${detailOpen ? "rotate-90" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          詳細情報
        </button>
        {detailOpen && (
          <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2 text-xs space-y-0.5">
            <DetailRow label="サーバーID" value={server.id} mono />
            <DetailRow label="ステータス" value={server.status} />
            <DetailRow label="VM状態" value={server["OS-EXT-STS:vm_state"]} />
            <DetailRow
              label="電源状態"
              value={server["OS-EXT-STS:power_state"] != null
                ? POWER_STATE[server["OS-EXT-STS:power_state"]] ?? String(server["OS-EXT-STS:power_state"])
                : undefined}
            />
            <DetailRow label="タスク" value={server["OS-EXT-STS:task_state"]} />
            <DetailRow label="AZ" value={server["OS-EXT-AZ:availability_zone"]} />
            <DetailRow label="ホスト" value={host} mono />
            <DetailRow label="インスタンス名" value={server["OS-EXT-SRV-ATTR:instance_name"]} mono />
            <DetailRow label="イメージID" value={server.image?.id} mono />
            <DetailRow label="フレーバー" value={flavor.name || flavor.original_name} />
            <DetailRow label="フレーバーID" value={flavor.id} mono />
            {flavor.ephemeral != null && (
              <DetailRow label="Ephemeral" value={`${flavor.ephemeral} GB`} />
            )}
            {(flavor.swap != null && flavor.swap !== 0) && (
              <DetailRow label="Swap" value={typeof flavor.swap === "number" ? `${flavor.swap} MB` : flavor.swap} />
            )}
            <DetailRow label="キー名" value={server.key_name} />
            <DetailRow label="テナントID" value={server.tenant_id} mono />
            <DetailRow label="ユーザーID" value={server.user_id} mono />
            <DetailRow label="作成日時" value={formatDate(server.created)} />
            <DetailRow label="更新日時" value={formatDate(server.updated)} />
            {(server.volumes ?? []).length > 0 && (
              <div className="flex items-start gap-2 py-0.5">
                <span className="text-gray-400 w-28 shrink-0 text-right">ボリューム</span>
                <div className="space-y-1">
                  {server.volumes!.map((v) => (
                    <div key={v.id} className="text-gray-700">
                      <span className="font-medium">{v.size} GB</span>
                      <span className="ml-1.5 text-gray-400">({v.status})</span>
                      {v.volume_type && <span className="ml-1.5 text-gray-400">[{v.volume_type}]</span>}
                      {v.bootable === "true" && <span className="ml-1.5 text-xs text-orange-500">boot</span>}
                      {v.name && <span className="ml-1.5">{v.name}</span>}
                      <div className="font-mono text-gray-400 text-[10px] break-all">{v.id}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {ipAddresses.some((ip) => ip.mac) && (
              <div className="flex items-start gap-2 py-0.5">
                <span className="text-gray-400 w-28 shrink-0 text-right">NIC</span>
                <div className="space-y-0.5">
                  {ipAddresses.filter((ip) => ip.mac && ip.version === 4).map((ip) => (
                    <div key={ip.mac} className="text-gray-700">
                      <span className="font-mono">{ip.mac}</span>
                      {ip.type && <span className="ml-1.5 text-gray-400">({ip.type})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {Object.keys(server.metadata).length > 0 && (
              <div className="flex items-start gap-2 py-0.5">
                <span className="text-gray-400 w-28 shrink-0 text-right">メタデータ</span>
                <div className="space-y-0.5">
                  {Object.entries(server.metadata).map(([k, v]) => (
                    <div key={k} className="text-gray-700">
                      <span className="text-gray-400">{k}:</span> {v}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* アクションボタン */}
      <div className="flex flex-wrap gap-2">
        {isActive && (
          <button
            onClick={async () => {
              setConsoleLoading(true);
              try {
                await onConsole(server.id);
              } finally {
                setConsoleLoading(false);
              }
            }}
            disabled={consoleLoading}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-amber-500 hover:bg-amber-600 text-white"
          >
            {consoleLoading && (
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            コンソール
          </button>
        )}
        {isShutoff && (
          <ActionButton
            label="起動"
            action="start"
            loading={loading}
            onClick={() => handleAction("start")}
            className="bg-green-600 hover:bg-green-700 text-white"
          />
        )}
        {isActive && (
          <>
            <ActionButton
              label="停止"
              action="stop"
              loading={loading}
              onClick={() => handleAction("stop")}
              className="bg-gray-600 hover:bg-gray-700 text-white"
            />
            <ActionButton
              label="再起動"
              action="reboot"
              loading={loading}
              onClick={() => handleAction("reboot")}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            />
          </>
        )}
        {(isActive || isShutoff) && (
          <ActionButton
            label="強制停止"
            action="force-stop"
            loading={loading}
            onClick={() => handleAction("force-stop")}
            className="bg-red-600 hover:bg-red-700 text-white"
          />
        )}
        {isTransitioning && (
          <span className="text-sm text-yellow-600 flex items-center gap-1">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            処理中...
          </span>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  action,
  loading,
  onClick,
  className,
}: {
  label: string;
  action: string;
  loading: string | null;
  onClick: () => void;
  className: string;
}) {
  const isLoading = loading === action;
  const isDisabled = loading !== null;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isLoading && (
        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {label}
    </button>
  );
}
