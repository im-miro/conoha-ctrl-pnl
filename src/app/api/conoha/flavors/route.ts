import { NextResponse } from "next/server";
import { getAllFlavors } from "@/lib/conoha-client";

export async function GET() {
  try {
    const flavors = await getAllFlavors();
    return NextResponse.json({ flavors });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    console.error("フレーバー一覧取得エラー:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
