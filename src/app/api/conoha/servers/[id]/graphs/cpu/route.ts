import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/conoha-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sp = request.nextUrl.searchParams;
    const accountId = sp.get("accountId");
    const start = sp.get("start") ?? undefined;
    const end = sp.get("end") ?? undefined;
    const mode = sp.get("mode") ?? undefined;

    if (!accountId) {
      return NextResponse.json(
        { error: "accountId が必要です" },
        { status: 400 }
      );
    }

    const client = getClient(accountId);
    const data = await client.getCpuGraph(id, start, end, mode);
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    console.error("CPUグラフ取得エラー:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
