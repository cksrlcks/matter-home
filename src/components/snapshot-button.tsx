"use client";

import { Camera, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { takeSnapshotAction } from "@/app/smartthings/actions";
import { Button } from "@/components/ui/button";

export function SnapshotButton({ deviceId }: { deviceId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      try {
        await takeSnapshotAction(deviceId);
        // 서버 컴포넌트를 다시 그려 새 captureTime의 이미지를 불러온다.
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "촬영에 실패했습니다.");
      }
    });
  };

  return (
    <Button onClick={handleClick} disabled={isPending}>
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
      {isPending ? "촬영 중…" : "새로 촬영"}
    </Button>
  );
}
