"use client";

import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRemoveDashboardItem } from "@/hooks/use-dashboard";
import { cn } from "@/lib/utils";
import type { DeviceSource } from "@/types/dashboard";

type Props = {
  source: DeviceSource;
  deviceId: string;
  message: string;
  className?: string;
};

// 메인에 표시하도록 선택했지만 불러올 수 없는 기기 (제거됨/조회 실패). 점선 타일.
export function UnavailableDeviceCard({ source, deviceId, message, className }: Props) {
  const router = useRouter();
  const remove = useRemoveDashboardItem();

  const handleRemove = () =>
    remove.mutate(
      { source, deviceId },
      {
        onSuccess: () => {
          toast.success("메인에서 제외했습니다.");
          router.refresh();
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "메인 표시 해제에 실패했습니다."),
      },
    );

  return (
    <Card
      className={cn(
        "flex min-h-40 flex-col items-center justify-center gap-3 border-dashed p-4 text-center",
        className,
      )}
    >
      <AlertCircle className="size-6 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRemove}
        disabled={remove.isPending}
      >
        메인에서 제외
      </Button>
    </Card>
  );
}
