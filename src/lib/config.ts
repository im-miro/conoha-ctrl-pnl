import fs from "fs";
import path from "path";

export interface ConoHaCredentials {
  apiUser: string;
  apiPassword: string;
  tenantId: string;
  region: string;
}

export interface ConoHaEndpoints {
  identity: string;
  compute: string;
}

let cachedCredentials: ConoHaCredentials | null = null;

export function getCredentials(): ConoHaCredentials {
  if (cachedCredentials) return cachedCredentials;

  const filePath = path.join(process.cwd(), "config", "conoha-credentials.json");

  if (!fs.existsSync(filePath)) {
    throw new Error(
      "config/conoha-credentials.json が見つかりません。config/conoha-credentials.example.json をコピーして作成してください。"
    );
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  cachedCredentials = JSON.parse(raw) as ConoHaCredentials;
  return cachedCredentials;
}

export function getEndpoints(region: string): ConoHaEndpoints {
  return {
    identity: `https://identity.${region}.conoha.io/v3`,
    compute: `https://compute.${region}.conoha.io/v2.1`,
  };
}
