"use client";

interface StatusBadgeProps {
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ACTIVE: {
    label: "稼働中",
    className: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700",
  },
  SHUTOFF: {
    label: "停止",
    className: "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600",
  },
  BUILD: {
    label: "構築中",
    className: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700 animate-pulse",
  },
  REBOOT: {
    label: "再起動中",
    className: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700 animate-pulse",
  },
  RESIZE: {
    label: "リサイズ中",
    className: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700 animate-pulse",
  },
  VERIFY_RESIZE: {
    label: "リサイズ確認",
    className: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700 animate-pulse",
  },
  MIGRATING: {
    label: "マイグレーション中",
    className: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700 animate-pulse",
  },
  ERROR: {
    label: "エラー",
    className: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700",
  },
  processing: {
    label: "処理中",
    className: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700 animate-pulse",
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-300 ${config.className}`}
    >
      {status === "ACTIVE" && (
        <span className="mr-1.5 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
      )}
      {config.label}
    </span>
  );
}
