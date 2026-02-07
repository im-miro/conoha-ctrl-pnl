import { NextResponse } from "next/server";
import { getServers } from "@/lib/conoha-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const servers = await getServers();
    return NextResponse.json({ servers });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    console.error("サーバー一覧取得エラー:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
