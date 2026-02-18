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
    const ports = await client.getServerPorts(id);
    if (ports.length === 0) {
      return NextResponse.json(
        { error: "ポートが見つかりません" },
        { status: 404 }
      );
    }

    const data = await client.getNetworkGraph(id, ports[0].id, start, end, mode);
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    console.error("ネットワークグラフ取得エラー:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
