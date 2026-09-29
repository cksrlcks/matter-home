"use client";

import { toast } from "sonner";

import { PowerButton } from "@/components/ui/power-button";
import { usePowerMutation } from "@/hooks/use-devices";
import type { DevicePowerDto } from "@/types/matter";

type Props = {
  nodeId: string;
  power: DevicePowerDto;
  disabled?: boolean;
};

// Matter 기기 전원 버튼. 낙관적 업데이트·롤백은 usePowerMutation이 처리한다.
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
    <PowerButton
      on={isOn}
      pending={isBusy}
      disabled={disabled}
      onClick={handleToggle}
    />
  );
}
