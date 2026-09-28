"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Pencil, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";

import { useRenameDevice, useResetDeviceName } from "@/hooks/use-devices";
import { Input } from "@/components/ui/input";

type Props = {
  nodeId: string;
  name: string;
  matterName: string;
  customName: string | null;
};

export function DeviceName({ nodeId, name, matterName, customName }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  const rename = useRenameDevice();
  const reset = useResetDeviceName();

  useEffect(() => {
    if (editing) {
      setValue(name);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing, name]);

  const submit = () => {
    const next = value.trim();
    if (!next) {
      toast.error("이름을 입력해주세요.");
      return;
    }
    if (next === name) {
      setEditing(false);
      return;
    }
    rename.mutate(
      { nodeId, name: next },
      {
        onSuccess: () => {
          toast.success("이름을 변경했습니다.");
          setEditing(false);
        },
        onError: (error) =>
          toast.error(
            error instanceof Error ? error.message : "이름 변경에 실패했습니다.",
          ),
      },
    );
  };

  const handleReset = () => {
    reset.mutate(nodeId, {
      onSuccess: () => toast.success("기본 이름으로 되돌렸습니다."),
      onError: (error) =>
        toast.error(
          error instanceof Error ? error.message : "초기화에 실패했습니다.",
        ),
    });
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
          disabled={rename.isPending}
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
        onClick={() => setEditing(true)}
        aria-label="이름 변경"
        className="shrink-0 rounded-md p-1 text-muted-foreground opacity-70 hover:bg-muted hover:opacity-100"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      {customName && customName !== matterName && (
        <button
          type="button"
          onClick={handleReset}
          disabled={reset.isPending}
          aria-label="기본 이름으로 초기화"
          title={`기본 이름: ${matterName}`}
          className="shrink-0 rounded-md p-1 text-muted-foreground opacity-70 hover:bg-muted hover:opacity-100 disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
