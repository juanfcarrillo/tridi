import { NextRequest, NextResponse } from "next/server";
import { RunPodStatusResponse } from "@/types/hunyuan";

// RunPod serverless endpoint configuration  
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID;
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;

export async function GET(req: NextRequest) {
  try {
    if (!RUNPOD_API_KEY || !RUNPOD_ENDPOINT_ID) {
      return NextResponse.json(
        { error: "RUNPOD_API_KEY and RUNPOD_ENDPOINT_ID environment variables are required" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json(
        { error: "taskId parameter is required" },
        { status: 400 }
      );
    }

    // Check the task status using the correct endpoint format
    const statusEndpoint = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/status/${taskId}`;
    const response = await fetch(statusEndpoint, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${RUNPOD_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("RunPod status API error:", errorText);
      return NextResponse.json(
        { error: `RunPod status API error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // RunPod status response format:
    // {
    //   "delayTime": 0,
    //   "executionTime": 120500,
    //   "id": "task-id-here",
    //   "input": {...},
    //   "output": {...}, // Only present when completed
    //   "status": "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED"
    // }
    
    const responseData: RunPodStatusResponse = {
      status: data.status,
      taskId: data.id,
      delayTime: data.delayTime,
      executionTime: data.executionTime,
    };

    if (data.status === "COMPLETED" && data.output) {
      responseData.output = data.output;
    } else if (data.status === "FAILED") {
      responseData.error = data.error || "Task failed without specific error message";
    }

    return NextResponse.json(responseData);
    
  } catch (error: unknown) {
    console.error("Error checking Hunyuan task status:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
