import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/conoha-client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const accountId = body.accountId as string;

    if (!accountId) {
      return NextResponse.json(
        { error: "accountId が必要です" },
        { status: 400 }
      );
    }

    const client = getClient(accountId);
    const url = await client.getConsoleUrl(id);
    return NextResponse.json({ url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    console.error("コンソールURL取得エラー:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
