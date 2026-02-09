import { NextRequest, NextResponse } from "next/server";
import { getCpuGraph } from "@/lib/conoha-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sp = request.nextUrl.searchParams;
    const start = sp.get("start") ?? undefined;
    const end = sp.get("end") ?? undefined;
    const mode = sp.get("mode") ?? undefined;

    const data = await getCpuGraph(id, start, end, mode);
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    console.error("CPUグラフ取得エラー:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
