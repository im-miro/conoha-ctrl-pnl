import { getAllAccounts, ConoHaAccount } from "./config";

interface TokenCache {
  token: string;
  expiresAt: number;
}

export interface Server {
  id: string;
  name: string;
  status: string;
  addresses: Record<string, Array<{ addr: string; version: number; "OS-EXT-IPS-MAC:mac_addr"?: string; "OS-EXT-IPS:type"?: string }>>;
  flavor: {
    id: string;
    name?: string;
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
  volumes?: VolumeDetail[];
  security_groups?: Array<{ name: string }>;
  "OS-EXT-SRV-ATTR:host"?: string;
  "OS-EXT-SRV-ATTR:hypervisor_hostname"?: string;
  "OS-EXT-SRV-ATTR:instance_name"?: string;
  tenant_id?: string;
  user_id?: string;
  accountId?: string;
}

interface ServersResponse {
  servers: Server[];
}

export interface FlavorDetail {
  id: string;
  name: string;
  ram: number;
  vcpus: number;
  disk: number;
  ephemeral?: number;
  swap?: number;
  accountId?: string;
}

interface FlavorsResponse {
  flavors: FlavorDetail[];
}

export interface VolumeDetail {
  id: string;
  name: string | null;
  size: number;
  status: string;
  volume_type?: string;
  bootable?: string;
}

interface VolumesResponse {
  volumes: VolumeDetail[];
}

export type ServerAction = "start" | "stop" | "reboot" | "force-stop";

export interface SecurityGroup {
  id: string;
  name: string;
  description: string;
  accountId?: string;
}

interface SecurityGroupsResponse {
  security_groups: SecurityGroup[];
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

interface RemoteConsoleResponse {
  remote_console: { protocol: string; type: string; url: string };
}

interface VncConsoleResponse {
  console: { type: string; url: string };
}

export interface GraphData {
  schema: string[];
  data: (number | null)[][];
}

export interface CpuGraphResponse {
  cpu: GraphData;
}

export interface DiskGraphResponse {
  disk: GraphData;
}

export interface NetworkGraphResponse {
  interface: GraphData;
}

const TOKEN_MARGIN_MS = 2 * 60 * 60 * 1000;

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

export class ConoHaClient {
  readonly account: ConoHaAccount;
  private tokenCache: TokenCache | null = null;
  private flavorCache: Map<string, FlavorDetail> | null = null;

  constructor(account: ConoHaAccount) {
    this.account = account;
  }

  get accountId(): string {
    return this.account.accountId;
  }

  get version() {
    return this.account.version;
  }

  private get endpoints() {
    return this.account.endpoints;
  }

  private get creds() {
    return this.account.credentials;
  }

  private async fetchToken(): Promise<string> {
    if (this.version === "v2") {
      return this.fetchTokenV2();
    }
    return this.fetchTokenV3();
  }

  private async fetchTokenV2(): Promise<string> {
    const res = await fetch(`${this.endpoints.identity}/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth: {
          passwordCredentials: {
            username: this.creds.apiUser,
            password: this.creds.apiPassword,
          },
          tenantId: this.creds.tenantId,
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`[${this.accountId}] トークン取得に失敗しました (${res.status}): ${body}`);
    }

    const json = await res.json();
    const token = json?.access?.token?.id;
    if (!token) {
      throw new Error(`[${this.accountId}] レスポンスにトークンが含まれていません`);
    }

    this.tokenCache = {
      token,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 - TOKEN_MARGIN_MS,
    };
    return token;
  }

  private async fetchTokenV3(): Promise<string> {
    const res = await fetch(`${this.endpoints.identity}/auth/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth: {
          identity: {
            methods: ["password"],
            password: {
              user: {
                name: this.creds.apiUser,
                password: this.creds.apiPassword,
                domain: { id: "default" },
              },
            },
          },
          scope: {
            project: {
              id: this.creds.tenantId,
            },
          },
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`[${this.accountId}] トークン取得に失敗しました (${res.status}): ${body}`);
    }

    const token = res.headers.get("x-subject-token");
    if (!token) {
      throw new Error(`[${this.accountId}] レスポンスにトークンが含まれていません`);
    }

    this.tokenCache = {
      token,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 - TOKEN_MARGIN_MS,
    };
    return token;
  }

  private async getToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.token;
    }
    return this.fetchToken();
  }

  private invalidateToken(): void {
    this.tokenCache = null;
  }

  private async apiRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getToken();

    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": token,
        ...options.headers,
      },
    });

    if (res.status === 401) {
      this.invalidateToken();
      const newToken = await this.getToken();

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
        throw new Error(`[${this.accountId}] API呼び出しに失敗しました (${retryRes.status}): ${body}`);
      }

      if (retryRes.status === 202 || retryRes.status === 204) {
        return undefined as T;
      }
      return retryRes.json() as Promise<T>;
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`[${this.accountId}] API呼び出しに失敗しました (${res.status}): ${body}`);
    }

    if (res.status === 202 || res.status === 204) {
      return undefined as T;
    }
    return res.json() as Promise<T>;
  }

  private getBlockStorageUrl(path: string): string {
    if (this.version === "v2") {
      return `${this.endpoints.blockStorage}${path}`;
    }
    return `${this.endpoints.blockStorage}/${this.creds.tenantId}${path}`;
  }

  private async getFlavorMap(): Promise<Map<string, FlavorDetail>> {
    if (this.flavorCache) return this.flavorCache;

    const data = await this.apiRequest<FlavorsResponse>(
      `${this.endpoints.compute}/flavors/detail`
    );

    this.flavorCache = new Map(data.flavors.map((f) => [f.id, f]));
    setTimeout(() => { this.flavorCache = null; }, 10 * 60 * 1000);
    return this.flavorCache;
  }

  private async getVolumeMap(): Promise<Map<string, VolumeDetail>> {
    const data = await this.apiRequest<VolumesResponse>(
      this.getBlockStorageUrl("/volumes/detail")
    );
    return new Map(data.volumes.map((v) => [v.id, v]));
  }

  async getServers(): Promise<Server[]> {
    const [serverData, flavorMap, volumeMap] = await Promise.all([
      this.apiRequest<ServersResponse>(`${this.endpoints.compute}/servers/detail`),
      this.getFlavorMap(),
      this.getVolumeMap(),
    ]);

    return serverData.servers.map((server) => {
      const detail = flavorMap.get(server.flavor.id);
      if (detail) {
        server.flavor = {
          ...server.flavor,
          name: detail.name,
          vcpus: detail.vcpus,
          ram: detail.ram,
          disk: detail.disk,
          ephemeral: detail.ephemeral,
          swap: detail.swap,
        };
      }

      const attachedIds = server["os-extended-volumes:volumes_attached"] ?? [];
      server.volumes = attachedIds
        .map((v) => volumeMap.get(v.id))
        .filter((v): v is VolumeDetail => v != null);

      server.accountId = this.accountId;
      return server;
    });
  }

  async executeServerAction(
    serverId: string,
    action: ServerAction
  ): Promise<void> {
    const actionBody = getActionBody(action);
    await this.apiRequest<void>(
      `${this.endpoints.compute}/servers/${serverId}/action`,
      {
        method: "POST",
        body: JSON.stringify(actionBody),
      }
    );
  }

  async getConsoleUrl(serverId: string): Promise<string> {
    if (this.version === "v2") {
      const data = await this.apiRequest<VncConsoleResponse>(
        `${this.endpoints.compute}/servers/${serverId}/action`,
        {
          method: "POST",
          body: JSON.stringify({
            "os-getVNCConsole": { type: "novnc" },
          }),
        }
      );
      return data.console.url;
    }

    const data = await this.apiRequest<RemoteConsoleResponse>(
      `${this.endpoints.compute}/servers/${serverId}/remote-consoles`,
      {
        method: "POST",
        body: JSON.stringify({
          remote_console: { protocol: "vnc", type: "novnc" },
        }),
      }
    );
    return data.remote_console.url;
  }

  async getSecurityGroups(): Promise<SecurityGroup[]> {
    const data = await this.apiRequest<SecurityGroupsResponse>(
      `${this.endpoints.networking}/security-groups`
    );
    return data.security_groups.map((sg) => ({ ...sg, accountId: this.accountId }));
  }

  async getServerPorts(serverId: string): Promise<Port[]> {
    const data = await this.apiRequest<PortsResponse>(
      `${this.endpoints.networking}/ports?device_id=${serverId}`
    );
    return data.ports;
  }

  async addSecurityGroup(serverId: string, sgId: string): Promise<void> {
    const ports = await this.getServerPorts(serverId);
    for (const port of ports) {
      if (port.security_groups.includes(sgId)) continue;
      await this.apiRequest<PortResponse>(
        `${this.endpoints.networking}/ports/${port.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            port: { security_groups: [...port.security_groups, sgId] },
          }),
        }
      );
    }
  }

  async removeSecurityGroup(serverId: string, sgId: string): Promise<void> {
    const ports = await this.getServerPorts(serverId);
    for (const port of ports) {
      if (!port.security_groups.includes(sgId)) continue;
      await this.apiRequest<PortResponse>(
        `${this.endpoints.networking}/ports/${port.id}`,
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

  async resizeServer(serverId: string, flavorId: string): Promise<void> {
    await this.apiRequest<void>(
      `${this.endpoints.compute}/servers/${serverId}/action`,
      {
        method: "POST",
        body: JSON.stringify({ resize: { flavorRef: flavorId } }),
      }
    );
  }

  async confirmResize(serverId: string): Promise<void> {
    await this.apiRequest<void>(
      `${this.endpoints.compute}/servers/${serverId}/action`,
      {
        method: "POST",
        body: JSON.stringify({ confirmResize: null }),
      }
    );
  }

  async revertResize(serverId: string): Promise<void> {
    await this.apiRequest<void>(
      `${this.endpoints.compute}/servers/${serverId}/action`,
      {
        method: "POST",
        body: JSON.stringify({ revertResize: null }),
      }
    );
  }

  async getFlavorList(): Promise<FlavorDetail[]> {
    const map = await this.getFlavorMap();
    return Array.from(map.values()).map((f) => ({ ...f, accountId: this.accountId }));
  }

  async getCpuGraph(
    serverId: string,
    start?: string,
    end?: string,
    mode?: string
  ): Promise<CpuGraphResponse> {
    const params = new URLSearchParams();
    if (start) params.set("start_date_raw", start);
    if (end) params.set("end_date_raw", end);
    if (mode) params.set("mode", mode);

    const qs = params.toString();
    return this.apiRequest<CpuGraphResponse>(
      `${this.endpoints.compute}/servers/${serverId}/rrd/cpu${qs ? `?${qs}` : ""}`
    );
  }

  async getDiskGraph(
    serverId: string,
    device?: string,
    start?: string,
    end?: string,
    mode?: string
  ): Promise<DiskGraphResponse> {
    const params = new URLSearchParams();
    if (device) params.set("device_name", device);
    if (start) params.set("start_date_raw", start);
    if (end) params.set("end_date_raw", end);
    if (mode) params.set("mode", mode);

    const qs = params.toString();
    return this.apiRequest<DiskGraphResponse>(
      `${this.endpoints.compute}/servers/${serverId}/rrd/disk${qs ? `?${qs}` : ""}`
    );
  }

  async getNetworkGraph(
    serverId: string,
    portId: string,
    start?: string,
    end?: string,
    mode?: string
  ): Promise<NetworkGraphResponse> {
    const params = new URLSearchParams();
    params.set("port_id", portId);
    if (start) params.set("start_date_raw", start);
    if (end) params.set("end_date_raw", end);
    if (mode) params.set("mode", mode);

    const qs = params.toString();
    return this.apiRequest<NetworkGraphResponse>(
      `${this.endpoints.compute}/servers/${serverId}/rrd/interface?${qs}`
    );
  }
}

// --- Client Registry ---

let clientRegistry: Map<string, ConoHaClient> | null = null;

function getClientRegistry(): Map<string, ConoHaClient> {
  if (clientRegistry) return clientRegistry;

  const accounts = getAllAccounts();
  clientRegistry = new Map();
  for (const account of accounts) {
    clientRegistry.set(account.accountId, new ConoHaClient(account));
  }
  return clientRegistry;
}

export function getClient(accountId: string): ConoHaClient {
  const registry = getClientRegistry();
  const client = registry.get(accountId);
  if (!client) {
    throw new Error(`アカウント ${accountId} が見つかりません`);
  }
  return client;
}

export function getAllClients(): ConoHaClient[] {
  return Array.from(getClientRegistry().values());
}

// --- Aggregation Functions ---

export async function getAllServers(): Promise<Server[]> {
  const clients = getAllClients();
  const results = await Promise.allSettled(
    clients.map((c) => c.getServers())
  );

  const servers: Server[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      servers.push(...result.value);
    } else {
      console.error("サーバー取得エラー:", result.reason);
    }
  }
  return servers;
}

export async function getAllSecurityGroups(): Promise<SecurityGroup[]> {
  const clients = getAllClients();
  const results = await Promise.allSettled(
    clients.map((c) => c.getSecurityGroups())
  );

  const groups: SecurityGroup[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      groups.push(...result.value);
    } else {
      console.error("セキュリティグループ取得エラー:", result.reason);
    }
  }
  return groups;
}

export async function getAllFlavors(): Promise<FlavorDetail[]> {
  const clients = getAllClients();
  const results = await Promise.allSettled(
    clients.map((c) => c.getFlavorList())
  );

  const flavors: FlavorDetail[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      flavors.push(...result.value);
    } else {
      console.error("フレーバー取得エラー:", result.reason);
    }
  }
  return flavors;
}
