import { NextResponse } from "next/server";
import { getSecurityGroups } from "@/lib/conoha-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const groups = await getSecurityGroups();
    return NextResponse.json({ security_groups: groups });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    console.error("セキュリティグループ一覧取得エラー:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
