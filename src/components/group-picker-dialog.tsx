"use client";

import { Check, Loader2, StarOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { DashboardGroupDto } from "@/types/dashboard";

type Props = {
  open: boolean;
  onClose: () => void;
  groups: DashboardGroupDto[];
  /** 현재 그룹. 그룹 미지정이면 null, 아직 메인에 없으면 undefined(선택 표시 없음) */
  value?: number | null;
  onSelect: (groupId: number | null) => void;
  pending?: boolean;
  title?: string;
  description?: string;
  /** 지정하면 하단 왼쪽에 "메인에서 해제" 버튼을 보여준다 (이미 메인에 있는 기기) */
  onRemove?: () => void;
  removePending?: boolean;
};

// 기기를 메인의 어느 그룹에 둘지 고르는 모달. 항목을 누르면 바로 반영한다.
export function GroupPickerDialog({
  open,
  onClose,
  groups,
  value,
  onSelect,
  pending,
  title = "그룹 선택",
  description = "메인 화면에서 이 기기를 어느 그룹에 둘지 고릅니다.",
  onRemove,
  removePending,
}: Props) {
  const options: { id: number | null; name: string }[] = [
    { id: null, name: "그룹 없음" },
    ...groups.map((g) => ({ id: g.id, name: g.name })),
  ];

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader title={title} description={description} />
      <ul role="listbox" aria-label="그룹" className="flex flex-col gap-1">
        {options.map((option) => {
          const selected = value !== undefined && option.id === value;
          return (
            <li key={option.id ?? "none"}>
              <button
                type="button"
                role="option"
                aria-selected={selected}
                disabled={pending}
                onClick={() => onSelect(option.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45",
                  selected && "bg-accent-soft text-secondary hover:bg-accent-soft",
                )}
              >
                <span className="truncate">{option.name}</span>
                {selected && <Check className="size-4 shrink-0" />}
              </button>
            </li>
          );
        })}
      </ul>
      {groups.length === 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          아직 그룹이 없습니다. ‘그룹관리’ 탭에서 먼저 그룹을 만들어 주세요.
        </p>
      )}
      <DialogFooter>
        {onRemove && (
          <Button
            variant="ghost"
            onClick={onRemove}
            disabled={pending || removePending}
            className="mr-auto text-danger hover:bg-danger/10 hover:text-danger"
          >
            {removePending ? <Loader2 className="animate-spin" /> : <StarOff />}
            메인에서 해제
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          취소
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
