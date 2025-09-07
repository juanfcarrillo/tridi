import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

// Configure R2 client
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path")?.replace(/^\/+/, "");
    if (!filePath) {
      return NextResponse.json({ error: "File path is required" }, { status: 400 });
    }
    // Get the file from R2
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: filePath,
    });
    const response = await r2Client.send(command);
    if (!response.Body) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    // Convert the stream to a buffer
    const chunks: Uint8Array[] = [];
    const reader = response.Body.transformToWebStream().getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const buffer = Buffer.concat(chunks);
    // Determine content type based on file extension
    const extension = filePath.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    switch (extension) {
      case 'glb':
        contentType = 'model/gltf-binary';
        break;
      case 'gltf':
        contentType = 'model/gltf+json';
        break;
      case 'obj':
      case 'mtl':
        contentType = 'text/plain';
        break;
      case 'png':
        contentType = 'image/png';
        break;
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
    }
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Cross-Origin-Embedder-Policy': 'cross-origin',
        'Cross-Origin-Opener-Policy': 'cross-origin',
      },
    });
  } catch (error) {
    console.error("Error fetching file from R2:", error);
    return NextResponse.json(
      { error: "Failed to fetch file from storage" },
      { status: 500 }
    );
  }
}
