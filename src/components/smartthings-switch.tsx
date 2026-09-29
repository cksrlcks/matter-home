"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setSwitchAction } from "@/app/(app)/devices/smartthings/actions";
import { PowerButton } from "@/components/ui/power-button";
import { Switch } from "@/components/ui/switch";

type Props = {
  deviceId: string;
  // null이면 상태를 알 수 없음(오프라인 등)
  initialOn: boolean | null;
  /** power = 타일 코너 원형 버튼(기본), switch = 상세 페이지용 큰 토글 */
  appearance?: "power" | "switch";
};

export function SmartThingsSwitch({
  deviceId,
  initialOn,
  appearance = "power",
}: Props) {
  const [on, setOn] = useState(initialOn);
  const [isPending, startTransition] = useTransition();

  const toggle = (next: boolean) => {
    startTransition(async () => {
      try {
        await setSwitchAction(deviceId, next);
        setOn(next);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "기기 제어에 실패했습니다.",
        );
      }
    });
  };

  if (appearance === "switch") {
    return (
      <div className="flex items-center gap-3">
        <Switch
          size="lg"
          checked={on === true}
          onCheckedChange={toggle}
          pending={isPending}
          disabled={on === null}
          aria-label="전원"
        />
        <span className="text-sm text-muted-foreground">
          {on === null ? "상태 없음" : on ? "켜짐" : "꺼짐"}
        </span>
      </div>
    );
  }

  return (
    <PowerButton
      on={on === true}
      pending={isPending}
      disabled={on === null}
      onClick={() => toggle(!on)}
    />
  );
}
