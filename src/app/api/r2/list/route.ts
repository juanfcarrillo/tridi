import { NextRequest, NextResponse } from "next/server";
import { listR2Files, filter3DModels, groupFilesBySession, isR2Configured } from "@/lib/r2";

export async function GET(req: NextRequest) {
  try {
    if (!isR2Configured()) {
      return NextResponse.json(
        { error: "R2 storage is not properly configured. Please check environment variables." },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const prefix = searchParams.get("prefix") || undefined;
    const maxResults = parseInt(searchParams.get("maxResults") || "50");
    const continuationToken = searchParams.get("continuationToken") || undefined;
    const filterModels = searchParams.get("filterModels") === "true";
    const groupBySessions = searchParams.get("groupBySessions") === "true";

    const result = await listR2Files(prefix, maxResults, continuationToken);
    
    let files = result.files;
    
    // Filter to only 3D model files if requested
    if (filterModels) {
      files = filter3DModels(files);
    }
    
    // Group files by generation session if requested
    if (groupBySessions) {
      const groupedFiles = groupFilesBySession(files);
      return NextResponse.json({
        sessions: groupedFiles,
        hasMore: result.hasMore,
        nextToken: result.nextToken,
      });
    }

    return NextResponse.json({
      files,
      hasMore: result.hasMore,
      nextToken: result.nextToken,
    });

  } catch (error: unknown) {
    console.error("Error listing R2 files:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
