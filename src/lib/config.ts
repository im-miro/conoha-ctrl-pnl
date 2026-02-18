import fs from "fs";
import path from "path";

export type ApiVersion = "v2" | "v3";

export interface ConoHaCredentials {
  apiUser: string;
  apiPassword: string;
  tenantId: string;
  region: string;
}

export interface ConoHaEndpoints {
  identity: string;
  compute: string;
  networking: string;
  blockStorage: string;
}

export interface ConoHaAccount {
  accountId: string;
  version: ApiVersion;
  credentials: ConoHaCredentials;
  endpoints: ConoHaEndpoints;
}

export function getEndpoints(
  version: ApiVersion,
  region: string,
  tenantId: string
): ConoHaEndpoints {
  if (version === "v2") {
    return {
      identity: `https://identity.${region}.conoha.io/v2.0`,
      compute: `https://compute.${region}.conoha.io/v2/${tenantId}`,
      networking: `https://networking.${region}.conoha.io/v2.0`,
      blockStorage: `https://block-storage.${region}.conoha.io/v2/${tenantId}`,
    };
  }
  return {
    identity: `https://identity.${region}.conoha.io/v3`,
    compute: `https://compute.${region}.conoha.io/v2.1`,
    networking: `https://networking.${region}.conoha.io/v2.0`,
    blockStorage: `https://block-storage.${region}.conoha.io/v3`,
  };
}

let cachedAccounts: ConoHaAccount[] | null = null;

function loadCredentialsDir(dirPath: string): ConoHaCredentials[] {
  if (!fs.existsSync(dirPath)) return [];
  const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".json"));
  const creds: ConoHaCredentials[] = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(dirPath, file), "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      creds.push(...(parsed as ConoHaCredentials[]));
    } else {
      creds.push(parsed as ConoHaCredentials);
    }
  }
  return creds;
}

function buildAccountId(
  version: ApiVersion,
  region: string,
  tenantId: string,
  allCreds: ConoHaCredentials[]
): string {
  const sameRegion = allCreds.filter((c) => c.region === region);
  if (sameRegion.length > 1) {
    return `${version}-${region}-${tenantId.slice(0, 8)}`;
  }
  return `${version}-${region}`;
}

export function getAllAccounts(): ConoHaAccount[] {
  if (cachedAccounts) return cachedAccounts;

  const configDir = path.join(process.cwd(), "config");
  const v2Creds = loadCredentialsDir(path.join(configDir, "v2"));
  const v3Creds = loadCredentialsDir(path.join(configDir, "v3"));

  if (v2Creds.length === 0 && v3Creds.length === 0) {
    throw new Error(
      "config/v2/ または config/v3/ に .json クレデンシャルファイルが必要です。"
    );
  }

  const accounts: ConoHaAccount[] = [];

  for (const creds of v2Creds) {
    accounts.push({
      accountId: buildAccountId("v2", creds.region, creds.tenantId, v2Creds),
      version: "v2",
      credentials: creds,
      endpoints: getEndpoints("v2", creds.region, creds.tenantId),
    });
  }

  for (const creds of v3Creds) {
    accounts.push({
      accountId: buildAccountId("v3", creds.region, creds.tenantId, v3Creds),
      version: "v3",
      credentials: creds,
      endpoints: getEndpoints("v3", creds.region, creds.tenantId),
    });
  }

  cachedAccounts = accounts;
  return accounts;
}
