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

function formatRam(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`;
  return `${mb} MB`;
}

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

export default function ServerCard({ server, onAction, onConsole }: ServerCardProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [consoleLoading, setConsoleLoading] = useState(false);

  const isActive = server.status === "ACTIVE";
  const isShutoff = server.status === "SHUTOFF";
  const isTransitioning = !isActive && !isShutoff && server.status !== "ERROR";

  const ipAddresses = getIpAddresses(server.addresses);
  const host = server["OS-EXT-SRV-ATTR:host"] || server["OS-EXT-SRV-ATTR:hypervisor_hostname"];
  const { flavor } = server;

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
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 truncate mr-3">
          {server.name}
        </h3>
        <StatusBadge status={loading ? "processing" : server.status} />
      </div>

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

      {(flavor.ram || flavor.vcpus || flavor.disk || flavor.original_name || host) && (
        <div className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 space-y-1">
          {flavor.original_name && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 w-14 shrink-0">プラン</span>
              <span className="font-medium text-gray-700">{flavor.original_name}</span>
            </div>
          )}
          {(flavor.vcpus || flavor.ram || flavor.disk) && (
            <div className="flex items-center gap-3">
              {flavor.vcpus && (
                <span><span className="text-gray-400">vCPU:</span> {flavor.vcpus}</span>
              )}
              {flavor.ram && (
                <span><span className="text-gray-400">RAM:</span> {formatRam(flavor.ram)}</span>
              )}
              {flavor.disk != null && (
                <span><span className="text-gray-400">Disk:</span> {flavor.disk} GB</span>
              )}
            </div>
          )}
          {host && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 w-14 shrink-0">ホスト</span>
              <span className="font-mono truncate">{host}</span>
            </div>
          )}
        </div>
      )}

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
