import { NextRequest, NextResponse } from "next/server";
import { getClient, ServerAction } from "@/lib/conoha-client";

const VALID_ACTIONS: ServerAction[] = ["start", "stop", "reboot", "force-stop"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const action = body.action as ServerAction;
    const accountId = body.accountId as string;

    if (!accountId) {
      return NextResponse.json(
        { error: "accountId が必要です" },
        { status: 400 }
      );
    }

    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: `無効なアクション: ${action}` },
        { status: 400 }
      );
    }

    const client = getClient(accountId);
    await client.executeServerAction(id, action);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    console.error("サーバーアクションエラー:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
