"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Pencil, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";

import {
  renameDeviceAction,
  resetDeviceNameAction,
} from "@/app/(app)/devices/smartthings/actions";
import { useRenameDevice, useResetDeviceName } from "@/hooks/use-devices";
import { Input } from "@/components/ui/input";

type EditableNameProps = {
  name: string;
  /** 초기화하면 돌아갈 기본 이름 (Matter/SmartThings 쪽 이름) */
  defaultName: string;
  customName: string | null;
  onRename: (name: string) => Promise<unknown>;
  onReset: () => Promise<unknown>;
};

// 앱 내 표시 이름 인라인 편집. 저장/초기화는 호출한 쪽(onRename/onReset)이 담당한다.
function EditableName({
  name,
  defaultName,
  customName,
  onRename,
  onReset,
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
          className="h-8"
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          aria-label="저장"
          className="shrink-0 rounded-md p-1.5 text-primary hover:bg-muted disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          aria-label="취소"
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <h2 className="truncate text-lg font-semibold">{name}</h2>
      <button
        type="button"
        onClick={startEditing}
        aria-label="이름 변경"
        className="shrink-0 rounded-md p-1 text-muted-foreground opacity-70 hover:bg-muted hover:opacity-100"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      {customName && customName !== defaultName && (
        <button
          type="button"
          onClick={handleReset}
          disabled={pending}
          aria-label="기본 이름으로 초기화"
          title={`기본 이름: ${defaultName}`}
          className="shrink-0 rounded-md p-1 text-muted-foreground opacity-70 hover:bg-muted hover:opacity-100 disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
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
