import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/conoha-client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { flavorId, accountId } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: "accountId が必要です" },
        { status: 400 }
      );
    }

    if (!flavorId || typeof flavorId !== "string") {
      return NextResponse.json(
        { error: "flavorId が必要です" },
        { status: 400 }
      );
    }

    const client = getClient(accountId);
    await client.resizeServer(id, flavorId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    console.error("リサイズエラー:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
