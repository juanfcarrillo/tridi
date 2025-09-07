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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json(
        { error: "File path is required" },
        { status: 400 }
      );
    }

    // Remove leading slash if present
    const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;

    console.log(`Fetching file from R2: ${cleanPath}`);

    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: cleanPath,
    });

    const response = await r2Client.send(command);

    if (!response.Body) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
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
    const extension = cleanPath.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (extension === 'glb' || extension === 'gltf') {
      contentType = 'model/gltf-binary';
    } else if (extension === 'obj') {
      contentType = 'text/plain';
    } else if (extension === 'mtl') {
      contentType = 'text/plain';
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error: unknown) {
    console.error("Error fetching file from R2:", error);
    
    if (error instanceof Error) {
      if (error.name === 'NoSuchKey') {
        return NextResponse.json(
          { error: "File not found in R2 storage" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to fetch file from R2 storage" },
      { status: 500 }
    );
  }
}
