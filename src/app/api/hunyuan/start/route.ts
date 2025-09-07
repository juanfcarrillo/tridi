import { NextRequest, NextResponse } from "next/server";
import { HunyuanRequest } from "@/types/hunyuan";

// RunPod serverless endpoint configuration
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID;
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;

export async function POST(req: NextRequest) {
  try {
    if (!RUNPOD_API_KEY || !RUNPOD_ENDPOINT_ID) {
      return NextResponse.json(
        { error: "RUNPOD_API_KEY and RUNPOD_ENDPOINT_ID environment variables are required" },
        { status: 500 }
      );
    }

    const body: HunyuanRequest = await req.json();
    
    // Validate required fields
    if (!body.input_image) {
      return NextResponse.json(
        { error: "input_image is required" },
        { status: 400 }
      );
    }

    if (!body.workflow || !["mesh", "texture", "enhanced"].includes(body.workflow)) {
      return NextResponse.json(
        { error: "workflow must be one of: mesh, texture, enhanced" },
        { status: 400 }
      );
    }

    // Start the RunPod task using the correct endpoint format
    const runpodEndpoint = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/run`;
    const response = await fetch(runpodEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RUNPOD_API_KEY}`,
      },
      body: JSON.stringify({
        input: body,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("RunPod API error:", errorText);
      return NextResponse.json(
        { error: `RunPod API error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // RunPod returns the task ID for async operations
    return NextResponse.json({ taskId: data.id });
    
  } catch (error: unknown) {
    console.error("Error starting Hunyuan task:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
