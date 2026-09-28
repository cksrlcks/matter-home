import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getEnergyUsage } from "@/lib/db/energy-samples";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const usage = await getEnergyUsage();
    return NextResponse.json(usage);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "전력 사용량을 불러오지 못했습니다.",
      },
      { status: 500 },
    );
  }
}
