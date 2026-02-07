import { getCredentials, getEndpoints } from "./config";

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

const TOKEN_MARGIN_MS = 2 * 60 * 60 * 1000; // 2時間のマージン（24時間有効 → 22時間で再取得）

async function fetchToken(): Promise<string> {
  const creds = getCredentials();
  const endpoints = getEndpoints(creds.region);

  const res = await fetch(`${endpoints.identity}/auth/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth: {
        identity: {
          methods: ["password"],
          password: {
            user: {
              name: creds.apiUser,
              password: creds.apiPassword,
              domain: { id: "default" },
            },
          },
        },
        scope: {
          project: {
            id: creds.tenantId,
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`トークン取得に失敗しました (${res.status}): ${body}`);
  }

  const token = res.headers.get("x-subject-token");
  if (!token) {
    throw new Error("レスポンスにトークンが含まれていません");
  }

  tokenCache = {
    token,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000 - TOKEN_MARGIN_MS,
  };

  return token;
}

async function getToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }
  return fetchToken();
}

function invalidateToken(): void {
  tokenCache = null;
}

async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": token,
      ...options.headers,
    },
  });

  // 401の場合はトークンを再取得してリトライ
  if (res.status === 401) {
    invalidateToken();
    const newToken = await getToken();

    const retryRes = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": newToken,
        ...options.headers,
      },
    });

    if (!retryRes.ok) {
      const body = await retryRes.text();
      throw new Error(`API呼び出しに失敗しました (${retryRes.status}): ${body}`);
    }

    if (retryRes.status === 202 || retryRes.status === 204) {
      return undefined as T;
    }
    return retryRes.json() as Promise<T>;
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API呼び出しに失敗しました (${res.status}): ${body}`);
  }

  if (res.status === 202 || res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export interface Server {
  id: string;
  name: string;
  status: string;
  addresses: Record<string, Array<{ addr: string; version: number; "OS-EXT-IPS-MAC:mac_addr"?: string; "OS-EXT-IPS:type"?: string }>>;
  flavor: {
    id: string;
    original_name?: string;
    ram?: number;
    vcpus?: number;
    disk?: number;
    ephemeral?: number;
    swap?: number;
  };
  image?: { id: string };
  metadata: Record<string, string>;
  created: string;
  updated: string;
  key_name?: string;
  "OS-EXT-STS:task_state"?: string | null;
  "OS-EXT-STS:vm_state"?: string;
  "OS-EXT-STS:power_state"?: number;
  "OS-EXT-AZ:availability_zone"?: string;
  "os-extended-volumes:volumes_attached"?: Array<{ id: string }>;
  security_groups?: Array<{ name: string }>;
  "OS-EXT-SRV-ATTR:host"?: string;
  "OS-EXT-SRV-ATTR:hypervisor_hostname"?: string;
  "OS-EXT-SRV-ATTR:instance_name"?: string;
  tenant_id?: string;
  user_id?: string;
}

interface ServersResponse {
  servers: Server[];
}

export async function getServers(): Promise<Server[]> {
  const creds = getCredentials();
  const endpoints = getEndpoints(creds.region);

  const data = await apiRequest<ServersResponse>(
    `${endpoints.compute}/servers/detail`
  );
  return data.servers;
}

export type ServerAction = "start" | "stop" | "reboot" | "force-stop";

export async function executeServerAction(
  serverId: string,
  action: ServerAction
): Promise<void> {
  const creds = getCredentials();
  const endpoints = getEndpoints(creds.region);

  const actionBody = getActionBody(action);

  await apiRequest<void>(
    `${endpoints.compute}/servers/${serverId}/action`,
    {
      method: "POST",
      body: JSON.stringify(actionBody),
    }
  );
}

interface RemoteConsoleResponse {
  remote_console: { protocol: string; type: string; url: string };
}

export async function getConsoleUrl(serverId: string): Promise<string> {
  const creds = getCredentials();
  const endpoints = getEndpoints(creds.region);

  const data = await apiRequest<RemoteConsoleResponse>(
    `${endpoints.compute}/servers/${serverId}/remote-consoles`,
    {
      method: "POST",
      body: JSON.stringify({
        remote_console: { protocol: "vnc", type: "novnc" },
      }),
    }
  );
  return data.remote_console.url;
}

// セキュリティグループ

export interface SecurityGroup {
  id: string;
  name: string;
  description: string;
}

interface SecurityGroupsResponse {
  security_groups: SecurityGroup[];
}

export async function getSecurityGroups(): Promise<SecurityGroup[]> {
  const creds = getCredentials();
  const endpoints = getEndpoints(creds.region);

  const data = await apiRequest<SecurityGroupsResponse>(
    `${endpoints.networking}/security-groups`
  );
  return data.security_groups;
}

interface Port {
  id: string;
  security_groups: string[];
  device_id: string;
}

interface PortsResponse {
  ports: Port[];
}

interface PortResponse {
  port: Port;
}

async function getServerPorts(serverId: string): Promise<Port[]> {
  const creds = getCredentials();
  const endpoints = getEndpoints(creds.region);

  const data = await apiRequest<PortsResponse>(
    `${endpoints.networking}/ports?device_id=${serverId}`
  );
  return data.ports;
}

export async function addSecurityGroup(
  serverId: string,
  sgId: string
): Promise<void> {
  const creds = getCredentials();
  const endpoints = getEndpoints(creds.region);

  const ports = await getServerPorts(serverId);
  for (const port of ports) {
    if (port.security_groups.includes(sgId)) continue;
    await apiRequest<PortResponse>(
      `${endpoints.networking}/ports/${port.id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          port: { security_groups: [...port.security_groups, sgId] },
        }),
      }
    );
  }
}

export async function removeSecurityGroup(
  serverId: string,
  sgId: string
): Promise<void> {
  const creds = getCredentials();
  const endpoints = getEndpoints(creds.region);

  const ports = await getServerPorts(serverId);
  for (const port of ports) {
    if (!port.security_groups.includes(sgId)) continue;
    await apiRequest<PortResponse>(
      `${endpoints.networking}/ports/${port.id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          port: {
            security_groups: port.security_groups.filter((id) => id !== sgId),
          },
        }),
      }
    );
  }
}

function getActionBody(action: ServerAction): Record<string, unknown> {
  switch (action) {
    case "start":
      return { "os-start": null };
    case "stop":
      return { "os-stop": null };
    case "reboot":
      return { reboot: { type: "SOFT" } };
    case "force-stop":
      return { "os-stop": { force_shutdown: true } };
  }
}
