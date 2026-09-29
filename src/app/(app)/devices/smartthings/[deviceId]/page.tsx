import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { LivePlayer } from "@/components/live-player";
import { SmartThingsSwitch } from "@/components/smartthings-switch";
import { SnapshotButton } from "@/components/snapshot-button";
import { Card } from "@/components/ui/card";
import {
  getCameraStatus,
  getDevice,
  isCamera,
  type CameraStatus,
} from "@/lib/smartthings";
import { smartThingsDeviceIdSchema } from "@/lib/validations/dashboard";

// 상태 조회 실패(429 등) 시 화면은 그대로 두고 값만 비운다. 실시간 영상은 go2rtc가 따로 받는다.
const EMPTY_STATUS: CameraStatus = {
  on: null,
  imageUrl: null,
  captureTime: null,
  clipUrl: null,
  clipTime: null,
  motion: { value: null },
  sound: { value: null },
};

const formatTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "-";

export default async function CameraPage({
  params,
}: {
  params: Promise<{ deviceId: string }>;
}) {
  await connection();
  const { deviceId } = await params;
  if (!smartThingsDeviceIdSchema.safeParse(deviceId).success) notFound();

  // 404/403만 "없는 기기"로 본다. 한도 초과 등 다른 오류는 그대로 오류 화면으로.
  const device = await getDevice(deviceId).catch((e: { status?: number }) => {
    if (e.status === 404 || e.status === 403) return null;
    throw e;
  });
  if (!device || !isCamera(device)) notFound();
  const loaded = await getCameraStatus(deviceId).catch(() => null);
  const status = loaded ?? EMPTY_STATUS;
  const media = `/api/smartthings/cameras/${deviceId}/media`;

  return (
    <>
      <Link
        href="/devices/smartthings"
        className="mb-4 inline-block text-sm text-muted-foreground hover:underline"
      >
        ← 목록
      </Link>

      {!loaded && (
        <p className="mb-4 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
          SmartThings 요청이 많아 카메라 상태를 불러오지 못했습니다. 잠시 후
          새로고침해 주세요. (실시간 영상은 그대로 볼 수 있습니다)
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card className="flex flex-col gap-3 p-5">
            <h2 className="truncate text-lg font-semibold">
              {device.label || device.name} · 실시간
            </h2>
            {status.on === false ? (
              <p className="text-sm text-muted-foreground">
                카메라가 꺼져 있습니다. 오른쪽에서 전원을 켜 주세요.
              </p>
            ) : (
              <LivePlayer deviceId={deviceId} />
            )}
          </Card>

          <Card className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">스냅샷</h2>
                <p className="text-sm text-muted-foreground">
                  촬영: {formatTime(status.captureTime)}
                </p>
              </div>
              <SnapshotButton deviceId={deviceId} />
            </div>
            {status.imageUrl ? (
              // 프록시 이미지라 next/image 최적화 대상이 아니다. captureTime으로 캐시를 무효화한다.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`${media}?type=image&t=${encodeURIComponent(status.captureTime ?? "")}`}
                alt={`${device.label || device.name} 스냅샷`}
                className="aspect-video w-full rounded-lg bg-muted object-contain"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                스냅샷이 없습니다.
              </p>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <p className="text-sm font-medium">카메라 전원</p>
            <SmartThingsSwitch deviceId={deviceId} initialOn={status.on} />
          </Card>

          <Card className="flex flex-col gap-2 p-5 text-sm">
            <p className="font-medium">감지 상태</p>
            <p>
              모션: {status.motion.value === "active" ? "감지됨" : "없음"}
              <span className="text-muted-foreground">
                {" "}
                · {formatTime(status.motion.timestamp)}
              </span>
            </p>
            <p>
              소리: {status.sound.value === "detected" ? "감지됨" : "없음"}
              <span className="text-muted-foreground">
                {" "}
                · {formatTime(status.sound.timestamp)}
              </span>
            </p>
          </Card>

          {status.clipUrl && (
            <Card className="flex flex-col gap-2 p-5">
              <p className="text-sm font-medium">최근 녹화 클립</p>
              <p className="text-xs text-muted-foreground">
                {formatTime(status.clipTime)}
              </p>
              <video
                src={`${media}?type=clip&t=${encodeURIComponent(status.clipTime ?? "")}`}
                controls
                preload="none" // 재생을 누를 때만 요청 (실패 시 브라우저 재시도가 API 한도를 소진)
                className="w-full rounded-lg bg-muted"
              />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
