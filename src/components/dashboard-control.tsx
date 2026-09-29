"use client";

import { useState } from "react";
import { FolderOpen, Loader2, Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  useDashboard,
  useRemoveDashboardItem,
  useSetDashboardItem,
} from "@/hooks/use-dashboard";
import { cn } from "@/lib/utils";
import type { DeviceSource } from "@/types/dashboard";

import { GroupPickerDialog } from "./group-picker-dialog";

type Props = {
  source: DeviceSource;
  deviceId: string;
  className?: string;
};

const onError = (error: unknown) =>
  toast.error(error instanceof Error ? error.message : "메인 표시 설정에 실패했습니다.");

// 기기관리 타일 하단 행: "메인에 표시" → 그룹 선택 모달 → 선택한 그룹으로 추가.
// 표시 중일 때도 같은 모달(그룹 변경)이 뜨고, 모달 하단의 "메인에서 해제"로 뺀다.
export function DashboardControl({ source, deviceId, className }: Props) {
  const { data, isPending, isError } = useDashboard();
  const setItem = useSetDashboardItem();
  const removeItem = useRemoveDashboardItem();
  const [picking, setPicking] = useState(false);

  const item = data?.items.find(
    (i) => i.source === source && i.deviceId === deviceId,
  );
  const pinned = !!item;
  const disabled = isPending || isError;
  const busy = setItem.isPending || removeItem.isPending;
  const groupName =
    item?.groupId != null
      ? data?.groups.find((g) => g.id === item.groupId)?.name
      : undefined;

  const selectGroup = (groupId: number | null) =>
    setItem.mutate(
      { source, deviceId, groupId },
      { onError, onSuccess: () => setPicking(false) },
    );

  const handleRemove = () =>
    removeItem.mutate(
      { source, deviceId },
      { onError, onSuccess: () => setPicking(false) },
    );

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setPicking(true)}
        disabled={disabled || busy}
        aria-pressed={pinned}
        className={cn(
          pinned &&
            "border-secondary/30 bg-accent-soft text-secondary hover:bg-accent-soft",
        )}
      >
        {isPending || busy ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Star className={cn(pinned && "fill-current")} />
        )}
        {pinned ? "메인 표시 중" : "메인에 표시"}
      </Button>

      {item && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPicking(true)}
          disabled={busy}
          aria-label="그룹 선택"
          className="max-w-full min-w-0"
        >
          <FolderOpen />
          <span className="truncate">{groupName ?? "그룹 없음"}</span>
        </Button>
      )}

      <GroupPickerDialog
        open={picking}
        onClose={() => setPicking(false)}
        groups={data?.groups ?? []}
        value={item ? item.groupId : undefined}
        onSelect={selectGroup}
        pending={setItem.isPending}
        onRemove={pinned ? handleRemove : undefined}
        removePending={removeItem.isPending}
        title={pinned ? "그룹 변경" : "메인에 표시"}
        description={
          pinned
            ? "이 기기를 메인 화면의 어느 그룹으로 옮길지 고릅니다."
            : "메인 화면의 어느 그룹에 표시할지 고릅니다. 고르면 바로 메인에 추가됩니다."
        }
      />
    </div>
  );
}
