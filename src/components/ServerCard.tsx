"use client";

import { useState } from "react";
import StatusBadge from "./StatusBadge";
import type { Server } from "@/lib/conoha-client";
import type { ServerAction } from "@/lib/conoha-client";

interface ServerCardProps {
  server: Server;
  onAction: (serverId: string, action: ServerAction) => Promise<void>;
  onConsole: (serverId: string) => Promise<void>;
}

function getIpAddresses(
  addresses: Server["addresses"]
): { addr: string; version: number }[] {
  const result: { addr: string; version: number }[] = [];
  for (const network of Object.values(addresses)) {
    for (const addr of network) {
      result.push(addr);
    }
  }
  return result;
}

export default function ServerCard({ server, onAction, onConsole }: ServerCardProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [consoleLoading, setConsoleLoading] = useState(false);

  const isActive = server.status === "ACTIVE";
  const isShutoff = server.status === "SHUTOFF";
  const isTransitioning = !isActive && !isShutoff && server.status !== "ERROR";

  const ipAddresses = getIpAddresses(server.addresses);

  async function handleAction(action: ServerAction) {
    setLoading(action);
    try {
      await onAction(server.id, action);
    } finally {
      // ローディングは3秒後に解除（ポーリングでステータスが更新されるため）
      setTimeout(() => setLoading(null), 3000);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 truncate mr-3">
          {server.name}
        </h3>
        <StatusBadge status={loading ? "processing" : server.status} />
      </div>

      <div className="mb-4 space-y-1 text-sm text-gray-600">
        {ipAddresses.map((ip) => (
          <div key={ip.addr} className="flex items-center gap-2">
            <span className="text-gray-400">
              {ip.version === 4 ? "IPv4" : "IPv6"}:
            </span>
            <code className="rounded bg-gray-50 px-1.5 py-0.5 text-xs font-mono">
              {ip.addr}
            </code>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className="text-gray-400">ID:</span>
          <code className="rounded bg-gray-50 px-1.5 py-0.5 text-xs font-mono truncate">
            {server.id.slice(0, 8)}...
          </code>
        </div>
      </div>

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
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
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
        <svg
          className="h-3.5 w-3.5 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {label}
    </button>
  );
}
