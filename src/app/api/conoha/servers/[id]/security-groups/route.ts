import { NextRequest, NextResponse } from "next/server";
import { addSecurityGroup, removeSecurityGroup } from "@/lib/conoha-client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { sgId } = await request.json();
    await addSecurityGroup(id, sgId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    console.error("セキュリティグループ追加エラー:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { sgId } = await request.json();
    await removeSecurityGroup(id, sgId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    console.error("セキュリティグループ削除エラー:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
