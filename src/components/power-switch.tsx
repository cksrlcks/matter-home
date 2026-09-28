"use client";

import { Loader2, Power } from "lucide-react";
import { toast } from "sonner";

import { usePowerMutation } from "@/hooks/use-devices";
import { cn } from "@/lib/utils";
import type { DevicePowerDto } from "@/types/matter";

type Props = {
  nodeId: string;
  power: DevicePowerDto;
  disabled?: boolean;
};

export function PowerSwitch({ nodeId, power, disabled }: Props) {
  const mutation = usePowerMutation();
  const isOn = power.on;
  // 요청 중이거나, 서버가 아직 누른 값을 반영하지 못해 대기 중이면 로더 유지
  const isBusy = mutation.isPending || power.pending === true;

  const handleToggle = () => {
    mutation.mutate(
      { nodeId, state: !isOn },
      {
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : "기기 제어에 실패했습니다.",
          );
        },
      },
    );
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={disabled || isBusy}
      aria-pressed={isOn}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        isOn
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "bg-muted text-muted-foreground hover:bg-muted/80",
      )}
    >
      {isBusy ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Power className="h-5 w-5" />
      )}
      {isOn ? "ON" : "OFF"}
    </button>
  );
}
