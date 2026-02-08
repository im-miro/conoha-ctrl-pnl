import { NextRequest, NextResponse } from "next/server";
import { getDiskGraph } from "@/lib/conoha-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sp = request.nextUrl.searchParams;
    const device = sp.get("device") ?? undefined;
    const start = sp.get("start") ?? undefined;
    const end = sp.get("end") ?? undefined;
    const mode = sp.get("mode") ?? undefined;

    const data = await getDiskGraph(id, device, start, end, mode);
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    console.error("ディスクIOグラフ取得エラー:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
