import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import {
  setDevicePower,
  UnknownSwitchEndpointError,
} from "@/lib/matter/devices";

export const dynamic = "force-dynamic";

const powerSchema = z.object({
  state: z.boolean(),
  // 다구 스위치에서 제어할 endpoint. 생략하면 첫 번째 On/Off endpoint.
  endpointId: z.number().int().nonnegative().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: "인증이 필요합니다." },
      { status: 401 },
    );
  }

  const { nodeId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = powerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "state(boolean) 값이 필요합니다." },
      { status: 400 },
    );
  }

  try {
    const result = await setDevicePower(
      nodeId,
      parsed.data.state,
      parsed.data.endpointId,
    );
    return NextResponse.json({
      success: true,
      endpointId: result.endpointId,
      state: result.on,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "기기 제어에 실패했습니다.",
      },
      { status: error instanceof UnknownSwitchEndpointError ? 404 : 502 },
    );
  }
}
