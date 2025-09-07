import { NextRequest, NextResponse } from "next/server";
import { getR2FileUrl, isR2Configured } from "@/lib/r2";

export async function GET(req: NextRequest) {
  try {
    if (!isR2Configured()) {
      return NextResponse.json(
        { error: "R2 storage is not properly configured. Please check environment variables." },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const expiresIn = parseInt(searchParams.get("expiresIn") || "3600");

    if (!key) {
      return NextResponse.json(
        { error: "key parameter is required" },
        { status: 400 }
      );
    }

    const url = await getR2FileUrl(key, expiresIn);

    return NextResponse.json({
      key,
      url,
      expiresIn,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    });

  } catch (error: unknown) {
    console.error("Error generating R2 file URL:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
