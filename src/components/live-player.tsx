"use client";

import { Loader2, RotateCw } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

// go2rtc MSE 플레이어. go2rtc www/video-rtc.js 의 MSE 부분만 옮겼다.
// ponytail: MSE만 지원(WebRTC/HLS 없음), iOS 17.1 미만 Safari는 재생 불가

// 브라우저가 지원하는 코덱을 go2rtc에 알려주면 맞는 형식으로 보내준다.
const CODECS = [
  "avc1.640029", // H.264 high 4.1
  "avc1.64002A", // H.264 high 4.2
  "avc1.640033", // H.264 high 5.1
  "hvc1.1.6.L153.B0", // H.265
  "mp4a.40.2", // AAC LC
  "mp4a.40.5", // AAC HE
  "flac",
  "opus",
];

type Status = "connecting" | "playing" | "error";

// Safari 17.1+ 는 ManagedMediaSource만 지원한다.
type MediaSourceWindow = typeof window & { ManagedMediaSource?: typeof MediaSource };
const getMediaSource = () => {
  const w = window as MediaSourceWindow;
  return w.ManagedMediaSource ?? w.MediaSource;
};
const subscribeNoop = () => () => {};

export function LivePlayer({ deviceId }: { deviceId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>("connecting");
  const [attempt, setAttempt] = useState(0);
  // 서버 렌더링에서는 지원한다고 가정하고, 브라우저에서 실제 여부를 확인한다.
  const supported = useSyncExternalStore(
    subscribeNoop,
    () => Boolean(getMediaSource()),
    () => true,
  );

  useEffect(() => {
    const video = videoRef.current;
    const MS = getMediaSource();
    if (!video || !MS) return;

    const ms = new MS();
    if ((window as MediaSourceWindow).ManagedMediaSource) {
      video.disableRemotePlayback = true;
      video.srcObject = ms;
    } else {
      video.src = URL.createObjectURL(ms);
    }

    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(
      `${proto}://${location.host}/go2rtc/api/ws?src=${encodeURIComponent(deviceId)}`,
    );
    ws.binaryType = "arraybuffer";

    let sb: SourceBuffer | null = null;
    const queue: ArrayBuffer[] = [];

    const append = () => {
      if (!sb || sb.updating || queue.length === 0) return;
      try {
        sb.appendBuffer(queue.shift()!);
      } catch {
        // 버퍼가 가득 찬 경우 등은 다음 조각에서 다시 시도
      }
    };

    // 최근 5초만 버퍼에 두고, 뒤처지면 재생 속도로 따라잡는다. (video-rtc.js 와 동일)
    const onUpdateEnd = () => {
      if (!sb || sb.updating) return;
      if (sb.buffered.length) {
        const end = sb.buffered.end(sb.buffered.length - 1);
        const start = end - 5;
        if (start > sb.buffered.start(0)) {
          sb.remove(sb.buffered.start(0), start);
          ms.setLiveSeekableRange(start, end);
        }
        if (video.currentTime < start) video.currentTime = start;
        const gap = end - video.currentTime;
        video.playbackRate = gap > 0.1 ? gap : 0.1;
      }
      append();
    };

    // WebSocket 열림 + MediaSource 준비가 둘 다 끝나면 코덱 목록을 보낸다.
    let pending = 2;
    const ready = () => {
      if (--pending > 0) return;
      const codecs = CODECS.filter((c) =>
        MS.isTypeSupported(`video/mp4; codecs="${c}"`),
      ).join();
      ws.send(JSON.stringify({ type: "mse", value: codecs }));
    };
    ms.addEventListener("sourceopen", ready, { once: true });
    ws.addEventListener("open", ready, { once: true });

    ws.addEventListener("message", (ev) => {
      if (typeof ev.data !== "string") {
        queue.push(ev.data);
        append();
        return;
      }
      const msg = JSON.parse(ev.data) as { type: string; value: string };
      if (msg.type === "mse") {
        sb = ms.addSourceBuffer(msg.value);
        sb.mode = "segments";
        sb.addEventListener("updateend", onUpdateEnd);
      } else if (msg.type === "error") {
        setStatus("error");
      }
    });
    // 정리(cleanup)로 닫힌 경우는 무시한다. (dev StrictMode에서 effect가 두 번 실행됨)
    let disposed = false;
    ws.addEventListener("close", () => {
      if (!disposed) setStatus("error");
    });

    const onPlaying = () => setStatus("playing");
    // 디코딩 오류 등으로 재생이 멈추면 다시 시도 버튼을 보여준다.
    const onError = () => setStatus("error");
    video.addEventListener("playing", onPlaying);
    video.addEventListener("error", onError);
    video.play().catch(() => {});

    return () => {
      disposed = true;
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("error", onError);
      ws.close();
      video.removeAttribute("src");
      video.srcObject = null;
    };
  }, [deviceId, attempt]);

  if (!supported) {
    return (
      <p className="text-sm text-muted-foreground">
        이 브라우저는 실시간 재생을 지원하지 않습니다. (iOS는 17.1 이상 필요)
      </p>
    );
  }

  const retry = () => {
    setStatus("connecting");
    setAttempt((n) => n + 1);
  };

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="h-full w-full object-contain"
      />
      {status !== "playing" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-white">
          {status === "connecting" ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              카메라 연결 중… (최대 15초)
            </>
          ) : (
            <>
              실시간 영상을 불러오지 못했습니다.
              <Button variant="outline" onClick={retry}>
                <RotateCw className="h-4 w-4" />
                다시 시도
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
