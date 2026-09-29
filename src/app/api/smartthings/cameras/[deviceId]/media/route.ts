import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import { fetchCameraMedia } from "@/lib/smartthings";

export const dynamic = "force-dynamic";

// SmartThings 미디어 서버는 토큰이 필요하므로 서버가 대신 받아 전달한다.
// ?type=image | clip  (clip은 Range 요청을 그대로 넘겨 video 탐색을 지원)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> },
) {
  if (!(await getSession())) {
    return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  }

  const { deviceId } = await params;
  const type = request.nextUrl.searchParams.get("type");
  if (!z.uuid().safeParse(deviceId).success || (type !== "image" && type !== "clip")) {
    return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 400 });
  }

  try {
    const upstream = await fetchCameraMedia(deviceId, type, request.headers.get("range"));
    if (!upstream) {
      return NextResponse.json({ message: "미디어가 없습니다." }, { status: 404 });
    }
    if (!upstream.ok) {
      return NextResponse.json(
        { message: `미디어를 가져오지 못했습니다. (${upstream.status})` },
        { status: 502 },
      );
    }

    const headers = new Headers({ "Cache-Control": "private, no-store" });
    for (const h of ["content-type", "content-length", "content-range", "accept-ranges"]) {
      const v = upstream.headers.get(h);
      if (v) headers.set(h, v);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "미디어 요청 실패" },
      { status: 502 },
    );
  }
}
