"use client";

import { Loader2, Power } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setSwitchAction } from "@/app/smartthings/actions";
import { cn } from "@/lib/utils";

type Props = {
  deviceId: string;
  // null이면 상태를 알 수 없음(오프라인 등)
  initialOn: boolean | null;
};

export function SmartThingsSwitch({ deviceId, initialOn }: Props) {
  const [on, setOn] = useState(initialOn);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const next = !on;
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

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={on === null || isPending}
      aria-pressed={on === true}
      className={cn(
        "mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        on
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "bg-muted text-muted-foreground hover:bg-muted/80",
      )}
    >
      {isPending ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Power className="h-5 w-5" />
      )}
      {on === null ? "상태 없음" : on ? "ON" : "OFF"}
    </button>
  );
}
