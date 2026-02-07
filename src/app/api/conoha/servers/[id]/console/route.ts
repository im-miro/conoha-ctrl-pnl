import { NextRequest, NextResponse } from "next/server";
import { getConsoleUrl } from "@/lib/conoha-client";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = await getConsoleUrl(id);
    return NextResponse.json({ url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    console.error("コンソールURL取得エラー:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
