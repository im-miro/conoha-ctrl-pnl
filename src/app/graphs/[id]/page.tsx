"use client";

import { useParams, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

const fetcher = <T,>(url: string) =>
  fetch(url).then((res) => res.json()) as Promise<T>;

interface GraphData {
  schema: string[];
  data: (number | null)[][];
}

interface CpuResponse {
  cpu: GraphData;
  error?: string;
}

interface DiskResponse {
  disk: GraphData;
  error?: string;
}

interface NetworkResponse {
  interface: GraphData;
  error?: string;
}

function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    setDark(el.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setDark(el.classList.contains("dark"));
    });
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

function chartColors(dark: boolean) {
  return {
    grid: dark ? "#374151" : "#e5e7eb",
    axis: dark ? "#4b5563" : "#d1d5db",
    tick: dark ? "#9ca3af" : "#9ca3af",
    tooltipBg: dark ? "#1f2937" : "#ffffff",
    tooltipBorder: dark ? "#374151" : "#e5e7eb",
    tooltipText: dark ? "#e5e7eb" : "#111827",
  };
}

type RangeKey = "1h" | "6h" | "24h" | "7d";

const RANGES: { key: RangeKey; label: string; seconds: number }[] = [
  { key: "1h", label: "1時間", seconds: 3600 },
  { key: "6h", label: "6時間", seconds: 6 * 3600 },
  { key: "24h", label: "24時間", seconds: 24 * 3600 },
  { key: "7d", label: "7日", seconds: 7 * 24 * 3600 },
];

function formatTime(unixtime: number): string {
  const d = new Date(unixtime * 1000);
  return d.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });
}

function formatDateTime(unixtime: number): string {
  const d = new Date(unixtime * 1000);
  return d.toLocaleString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });
}

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "N/A";
  const abs = Math.abs(bytes);
  if (abs >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB/s`;
  if (abs >= 1e6) return `${(bytes / 1e6).toFixed(2)} MB/s`;
  if (abs >= 1e3) return `${(bytes / 1e3).toFixed(2)} KB/s`;
  return `${bytes.toFixed(0)} B/s`;
}

function buildParams(range: RangeKey, accountId: string): string {
  const r = RANGES.find((r) => r.key === range)!;
  // 60秒単位に丸めてSWRキーの無限更新を防止
  const end = Math.floor(Date.now() / 60000) * 60;
  const start = end - r.seconds;
  return `start=${start}&end=${end}&mode=AVERAGE&accountId=${encodeURIComponent(accountId)}`;
}

function hasNonNullValues(data: (number | null)[][], valueIndices: number[]): boolean {
  return data.some((row) => valueIndices.some((i) => row[i] != null));
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <svg
        className="h-8 w-8 animate-spin text-indigo-500"
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
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
      {message}
    </div>
  );
}

function CpuChart({ serverId, range, accountId, dark }: { serverId: string; range: RangeKey; accountId: string; dark: boolean }) {
  const colors = chartColors(dark);
  const { data, error, isLoading } = useSWR<CpuResponse>(
    `/api/conoha/servers/${serverId}/graphs/cpu?${buildParams(range, accountId)}`,
    fetcher<CpuResponse>,
    { refreshInterval: 60000 }
  );

  if (isLoading) return <Spinner />;
  if (error || data?.error)
    return <ErrorBox message={data?.error || "CPU データ取得に失敗しました"} />;
  if (!data?.cpu?.data?.length || !hasNonNullValues(data.cpu.data, [1]))
    return <ErrorBox message="CPU データがありません（サーバーが停止中の可能性があります）" />;

  // ConoHa APIはvCPU合算値を返す場合がある(2vCPU→最大200%)
  // schemaからvCPU数は取れないのでmax値から推定して正規化
  const rawValues = data.cpu.data
    .filter((row) => row[0] != null && row[1] != null)
    .map((row) => row[1] as number);
  const maxRaw = Math.max(...rawValues, 1);
  // 100超ならvCPU合算値と判断し、推定vCPU数で割る
  const vcpuCount = maxRaw > 100 ? Math.ceil(maxRaw / 100) : 1;

  const chartData = data.cpu.data
    .filter((row) => row[0] != null)
    .map((row) => ({
      time: row[0] as number,
      cpu: row[1] != null ? (row[1] as number) / vcpuCount : null,
    }));

  const isLongRange = range === "7d";

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
        <XAxis
          dataKey="time"
          tickFormatter={isLongRange ? formatDateTime : formatTime}
          tick={{ fontSize: 11, fill: colors.tick }}
          stroke={colors.axis}
        />
        <YAxis
          domain={[0, "auto"]}
          tickFormatter={(v) => `${v.toFixed(0)}%`}
          tick={{ fontSize: 11, fill: colors.tick }}
          stroke={colors.axis}
        />
        <Tooltip
          labelFormatter={(v) => formatDateTime(v as number)}
          formatter={(v) => [`${Number(v ?? 0).toFixed(1)}%`, "CPU"]}
          contentStyle={{
            borderRadius: "8px",
            border: `1px solid ${colors.tooltipBorder}`,
            fontSize: 12,
            backgroundColor: colors.tooltipBg,
            color: colors.tooltipText,
          }}
        />
        <Area
          type="monotone"
          dataKey="cpu"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#cpuGrad)"
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function DiskChart({
  serverId,
  range,
  accountId,
  dark,
}: {
  serverId: string;
  range: RangeKey;
  accountId: string;
  dark: boolean;
}) {
  const { data, error, isLoading } = useSWR<DiskResponse>(
    `/api/conoha/servers/${serverId}/graphs/disk?${buildParams(range, accountId)}`,
    fetcher<DiskResponse>,
    { refreshInterval: 60000 }
  );

  if (isLoading) return <Spinner />;
  if (error || data?.error)
    return (
      <ErrorBox message={data?.error || "ディスクIO データ取得に失敗しました"} />
    );
  if (!data?.disk?.data?.length || !hasNonNullValues(data.disk.data, [1, 2]))
    return <ErrorBox message="ディスクIO データがありません（サーバーが停止中の可能性があります）" />;

  const colors = chartColors(dark);
  const chartData = data.disk.data
    .filter((row) => row[0] != null)
    .map((row) => ({
      time: row[0] as number,
      read: row[1] as number | null,
      write: row[2] as number | null,
    }));

  const isLongRange = range === "7d";

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
        <XAxis
          dataKey="time"
          tickFormatter={isLongRange ? formatDateTime : formatTime}
          tick={{ fontSize: 11, fill: colors.tick }}
          stroke={colors.axis}
        />
        <YAxis
          tickFormatter={(v) => formatBytes(v)}
          tick={{ fontSize: 11, fill: colors.tick }}
          stroke={colors.axis}
        />
        <Tooltip
          labelFormatter={(v) => formatDateTime(v as number)}
          formatter={(v, name) => [
            formatBytes(Number(v ?? 0)),
            name === "read" ? "Read" : "Write",
          ]}
          contentStyle={{
            borderRadius: "8px",
            border: `1px solid ${colors.tooltipBorder}`,
            fontSize: 12,
            backgroundColor: colors.tooltipBg,
            color: colors.tooltipText,
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="read"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
          connectNulls
          name="Read"
        />
        <Line
          type="monotone"
          dataKey="write"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={false}
          connectNulls
          name="Write"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function NetworkChart({
  serverId,
  range,
  accountId,
  dark,
}: {
  serverId: string;
  range: RangeKey;
  accountId: string;
  dark: boolean;
}) {
  const { data, error, isLoading } = useSWR<NetworkResponse>(
    `/api/conoha/servers/${serverId}/graphs/network?${buildParams(range, accountId)}`,
    fetcher<NetworkResponse>,
    { refreshInterval: 60000 }
  );

  if (isLoading) return <Spinner />;
  if (error || data?.error)
    return (
      <ErrorBox
        message={data?.error || "ネットワーク データ取得に失敗しました"}
      />
    );
  if (!data?.interface?.data?.length || !hasNonNullValues(data.interface.data, [1, 2]))
    return <ErrorBox message="ネットワーク データがありません（サーバーが停止中の可能性があります）" />;

  const colors = chartColors(dark);
  const chartData = data.interface.data
    .filter((row) => row[0] != null)
    .map((row) => ({
      time: row[0] as number,
      rx: row[1] as number | null,
      tx: row[2] as number | null,
    }));

  const isLongRange = range === "7d";

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
        <XAxis
          dataKey="time"
          tickFormatter={isLongRange ? formatDateTime : formatTime}
          tick={{ fontSize: 11, fill: colors.tick }}
          stroke={colors.axis}
        />
        <YAxis
          tickFormatter={(v) => formatBytes(v)}
          tick={{ fontSize: 11, fill: colors.tick }}
          stroke={colors.axis}
        />
        <Tooltip
          labelFormatter={(v) => formatDateTime(v as number)}
          formatter={(v, name) => [
            formatBytes(Number(v ?? 0)),
            name === "rx" ? "RX (受信)" : "TX (送信)",
          ]}
          contentStyle={{
            borderRadius: "8px",
            border: `1px solid ${colors.tooltipBorder}`,
            fontSize: 12,
            backgroundColor: colors.tooltipBg,
            color: colors.tooltipText,
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="rx"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          connectNulls
          name="RX (受信)"
        />
        <Line
          type="monotone"
          dataKey="tx"
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
          connectNulls
          name="TX (送信)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function GraphsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const serverId = params.id as string;
  const accountId = searchParams.get("accountId") ?? "";
  const [range, setRange] = useState<RangeKey>("1h");
  const dark = useDark();

  if (!accountId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 flex items-center justify-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
          accountId が指定されていません
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            サーバーモニタリング
          </h1>
          <div className="flex gap-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  range === r.key
                    ? "bg-indigo-600 text-white"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-gray-200">
              CPU 使用率
            </h2>
            <CpuChart serverId={serverId} range={range} accountId={accountId} dark={dark} />
          </section>

          <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-gray-200">
              ディスク I/O
            </h2>
            <DiskChart serverId={serverId} range={range} accountId={accountId} dark={dark} />
          </section>

          <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-gray-200">
              ネットワーク トラフィック
            </h2>
            <NetworkChart serverId={serverId} range={range} accountId={accountId} dark={dark} />
          </section>
        </div>

        <div className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
          サーバーID: {serverId} / アカウント: {accountId}
        </div>
      </div>
    </div>
  );
}
