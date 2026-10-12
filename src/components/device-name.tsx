"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Pencil, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";

import {
  renameDeviceAction,
  resetDeviceNameAction,
} from "@/app/(app)/devices/smartthings/actions";
import {
  useRenameDevice,
  useRenameSwitch,
  useResetDeviceName,
  useResetSwitchName,
} from "@/hooks/use-devices";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type EditableNameProps = {
  name: string;
  /** 초기화하면 돌아갈 기본 이름 (Matter/SmartThings 쪽 이름) */
  defaultName: string;
  customName: string | null;
  onRename: (name: string) => Promise<unknown>;
  onReset: () => Promise<unknown>;
  /** title = 타일 제목(기본), row = 타일 안 스위치 행의 작은 이름 */
  size?: "title" | "row";
};

// 앱 내 표시 이름 인라인 편집. 저장/초기화는 호출한 쪽(onRename/onReset)이 담당한다.
function EditableName({
  name,
  defaultName,
  customName,
  onRename,
  onReset,
  size = "title",
}: EditableNameProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const startEditing = () => {
    setValue(name);
    setEditing(true);
  };

  const submit = async () => {
    const next = value.trim();
    if (!next) {
      toast.error("이름을 입력해주세요.");
      return;
    }
    if (next === name) {
      setEditing(false);
      return;
    }
    setPending(true);
    try {
      await onRename(next);
      toast.success("이름을 변경했습니다.");
      setEditing(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "이름 변경에 실패했습니다.",
      );
    } finally {
      setPending(false);
    }
  };

  const handleReset = async () => {
    setPending(true);
    try {
      await onReset();
      toast.success("기본 이름으로 되돌렸습니다.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "초기화에 실패했습니다.",
      );
    } finally {
      setPending(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          ref={inputRef}
          value={value}
          maxLength={64}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") setEditing(false);
          }}
          className={cn("h-8", size === "row" && "min-w-0")}
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          aria-label="저장"
          className="grid size-9 shrink-0 place-items-center rounded-full text-primary hover:bg-muted disabled:opacity-50"
        >
          <Check className="size-4.5" />
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          aria-label="취소"
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <X className="size-4.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-0.5">
      {size === "title" ? (
        <h2 className="mr-1 truncate text-lg font-semibold">{name}</h2>
      ) : (
        <span className="mr-1 truncate text-sm font-medium">{name}</span>
      )}
      <button
        type="button"
        onClick={startEditing}
        aria-label="이름 변경"
        className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Pencil className="size-4" />
      </button>
      {customName && customName !== defaultName && (
        <button
          type="button"
          onClick={handleReset}
          disabled={pending}
          aria-label="기본 이름으로 초기화"
          title={`기본 이름: ${defaultName}`}
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <RotateCcw className="size-4" />
        </button>
      )}
    </div>
  );
}

type Props = {
  nodeId: string;
  name: string;
  matterName: string;
  customName: string | null;
};

export function DeviceName({ nodeId, name, matterName, customName }: Props) {
  const rename = useRenameDevice();
  const reset = useResetDeviceName();

  return (
    <EditableName
      name={name}
      defaultName={matterName}
      customName={customName}
      onRename={(next) => rename.mutateAsync({ nodeId, name: next })}
      onReset={() => reset.mutateAsync(nodeId)}
    />
  );
}

type SwitchNameProps = {
  nodeId: string;
  endpointId: number;
  name: string;
  defaultName: string;
  customName: string | null;
};

// 다구 스위치의 구(endpoint)별 이름
export function SwitchName({
  nodeId,
  endpointId,
  name,
  defaultName,
  customName,
}: SwitchNameProps) {
  const rename = useRenameSwitch();
  const reset = useResetSwitchName();

  return (
    <EditableName
      size="row"
      name={name}
      defaultName={defaultName}
      customName={customName}
      onRename={(next) => rename.mutateAsync({ nodeId, endpointId, name: next })}
      onReset={() => reset.mutateAsync({ nodeId, endpointId })}
    />
  );
}

type SmartThingsProps = {
  deviceId: string;
  name: string;
  /** SmartThings 쪽 이름 (label 또는 name) */
  smartThingsName: string;
  customName: string | null;
};

// SmartThings 기기는 앱 DB에만 이름을 저장한다. 서버 액션이 refresh()로 화면을 갱신한다.
export function SmartThingsDeviceName({
  deviceId,
  name,
  smartThingsName,
  customName,
}: SmartThingsProps) {
  return (
    <EditableName
      name={name}
      defaultName={smartThingsName}
      customName={customName}
      onRename={(next) => renameDeviceAction(deviceId, next)}
      onReset={() => resetDeviceNameAction(deviceId)}
    />
  );
}
