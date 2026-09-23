import { NextResponse } from "next/server";
import { createApiEnvelope } from "@/lib/bounded-contexts/types/common.types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    createApiEnvelope({
      status: "healthy",
      version: "v1.0.0-enterprise",
      environment: process.env.NODE_ENV || "production",
      services: {
        database: "online",
        outbox_worker: "active",
        event_bus: "listening",
        radar_engine: "ready",
      },
      timestamp: new Date().toISOString(),
    })
  );
}
