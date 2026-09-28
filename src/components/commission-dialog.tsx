"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bluetooth, Loader2, Radar, Wifi } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import type { CommissionableDeviceDto } from "@/types/matter";

import {
  useCommissionDevice,
  useDiscoverDevices,
} from "@/hooks/use-devices";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const commissionSchema = z.object({
  code: z.string().trim().min(8, "Matter 페어링 코드를 입력해주세요."),
});

type CommissionValues = z.infer<typeof commissionSchema>;

type CommissionMutation = ReturnType<typeof useCommissionDevice>;

type Props = {
  open: boolean;
  onClose: () => void;
};

// 기기 추가 흐름: [주변 기기 검색] → 기기 선택 → 페어링 코드 입력 → commissionWithCode
// discover만으로는 등록되지 않는다. 실제 commissioning에는 setup code가 필요하다.
export function CommissionDialog({ open, onClose }: Props) {
  const commission = useCommissionDevice();

  // commissioning 중에는 임의로 닫히지 않게 한다.
  const handleClose = () => {
    if (!commission.isPending) onClose();
  };

  // Dialog는 닫히면 children을 렌더하지 않으므로, 내부 상태(단계/검색결과/폼)는
  // 닫을 때마다 자연스럽게 초기화된다.
  return (
    <Dialog open={open} onClose={handleClose}>
      <CommissionFlow commission={commission} onClose={onClose} />
    </Dialog>
  );
}

type Step =
  | { type: "discover" }
  | { type: "code"; device: CommissionableDeviceDto | null };

type FlowProps = {
  commission: CommissionMutation;
  onClose: () => void;
};

function CommissionFlow({ commission, onClose }: FlowProps) {
  const [step, setStep] = useState<Step>({ type: "discover" });

  if (step.type === "discover") {
    return (
      <DiscoverStep
        onSelect={(device) => setStep({ type: "code", device })}
        onManual={() => setStep({ type: "code", device: null })}
        onClose={onClose}
      />
    );
  }

  return (
    <CodeStep
      device={step.device}
      commission={commission}
      onBack={() => setStep({ type: "discover" })}
      onClose={onClose}
    />
  );
}

type DiscoverStepProps = {
  onSelect: (device: CommissionableDeviceDto) => void;
  onManual: () => void;
  onClose: () => void;
};

function DiscoverStep({ onSelect, onManual, onClose }: DiscoverStepProps) {
  const discover = useDiscoverDevices();
  const searching = discover.isFetching;
  const devices = discover.data;

  return (
    <>
      <DialogHeader
        title="Matter 기기 추가"
        description="기기를 페어링 모드로 만든 뒤 주변 기기를 검색해주세요."
      />

      <div className="flex flex-col gap-3">
        <Button
          variant="outline"
          onClick={() => discover.refetch()}
          disabled={searching}
        >
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Radar className="h-4 w-4" />
          )}
          {devices ? "다시 검색" : "주변 기기 검색"}
        </Button>

        {searching && (
          <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            주변 기기를 찾는 중입니다... (BLE/mDNS, 최대 수십 초)
          </div>
        )}

        {!searching && discover.error && (
          <p className="text-sm text-danger">{discover.error.message}</p>
        )}

        {!searching && devices && devices.length === 0 && (
          <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
            찾은 기기가 없습니다. 기기가 페어링 모드인지 확인한 뒤 다시
            검색하거나, 코드로 직접 추가해주세요.
          </p>
        )}

        {!searching && devices && devices.length > 0 && (
          <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
            {devices.map((device) => (
              <li key={device.id}>
                <DiscoveredDeviceItem
                  device={device}
                  onClick={() => onSelect(device)}
                />
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={onManual}
          className="self-start text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          검색 없이 페어링 코드로 직접 추가
        </button>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          취소
        </Button>
      </DialogFooter>
    </>
  );
}

type DiscoveredDeviceItemProps = {
  device: CommissionableDeviceDto;
  onClick?: () => void;
  className?: string;
};

function DiscoveredDeviceItem({
  device,
  onClick,
  className,
}: DiscoveredDeviceItemProps) {
  const TransportIcon = device.transport === "ble" ? Bluetooth : Wifi;
  const meta = [
    device.vendorName,
    device.deviceType,
    device.discriminator !== undefined
      ? `discriminator ${device.discriminator}`
      : undefined,
  ].filter(Boolean);

  const content = (
    <>
      <TransportIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium">{device.name}</span>
        {meta.length > 0 && (
          <span className="truncate text-xs text-muted-foreground">
            {meta.join(" · ")}
          </span>
        )}
      </div>
    </>
  );

  const base =
    "flex w-full items-center gap-3 rounded-lg border border-border px-4 py-3 text-left";

  if (!onClick) return <div className={cn(base, className)}>{content}</div>;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(base, "transition-colors hover:bg-muted", className)}
    >
      {content}
    </button>
  );
}

type CodeStepProps = {
  device: CommissionableDeviceDto | null;
  commission: CommissionMutation;
  onBack: () => void;
  onClose: () => void;
};

function CodeStep({ device, commission, onBack, onClose }: CodeStepProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CommissionValues>({
    resolver: zodResolver(commissionSchema),
    defaultValues: { code: "" },
  });

  const pending = commission.isPending;

  const onSubmit = handleSubmit(async (values) => {
    try {
      const added = await commission.mutateAsync(values.code);
      toast.success(`'${added.name}'을(를) 추가했습니다.`);
      onClose();
    } catch (error) {
      setError("root", {
        message:
          error instanceof Error ? error.message : "기기 추가에 실패했습니다.",
      });
    }
  });

  return (
    <>
      <DialogHeader
        title="Matter 기기 추가"
        description="기기 본체나 설명서에 있는 QR 코드 아래 페어링 코드를 입력해주세요."
      />
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {device && <DiscoveredDeviceItem device={device} />}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="code">Matter 페어링 코드</Label>
          <Input
            id="code"
            placeholder="0262-351-6467 또는 MT:..."
            autoComplete="off"
            autoFocus
            disabled={pending}
            {...register("code")}
          />
          {errors.code && (
            <p className="text-sm text-danger">{errors.code.message}</p>
          )}
        </div>

        {pending && (
          <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            기기를 연결하는 중입니다... (최대 몇 분 소요)
          </div>
        )}

        {errors.root && (
          <p className="text-sm text-danger">{errors.root.message}</p>
        )}

        <DialogFooter className="justify-between">
          <Button variant="ghost" onClick={onBack} disabled={pending}>
            이전
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={pending}>
              취소
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              기기 연결
            </Button>
          </div>
        </DialogFooter>
      </form>
    </>
  );
}
