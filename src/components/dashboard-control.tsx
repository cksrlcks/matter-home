"use client";

import { useState } from "react";
import { FolderOpen, Loader2, Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useDashboard, useSaveLayout } from "@/hooks/use-dashboard";
import {
  removeDevice,
  removeEndpoint,
  sameDevice,
  setDeviceGroup,
  setEndpointGroup,
} from "@/lib/dashboard-layout";
import { cn } from "@/lib/utils";
import type { DeviceSource } from "@/types/dashboard";

import { GroupPickerDialog } from "./group-picker-dialog";

type Props = {
  source: DeviceSource;
  deviceId: string;
  /** 다구 기기의 구(endpoint) 목록. 2개 이상이면 홈에 구별 타일로 풀어서 올린다 */
  endpointIds?: number[];
  /**
   * 지정하면 기기 전체가 아니라 이 구(endpoint) 하나의 홈 표시를 다룬다.
   * 다구 기기의 구별 행에 별 아이콘 버튼으로 놓인다.
   */
  endpointId?: number;
  /** 구 이름 (endpointId와 함께, 버튼의 접근성 이름에 쓴다) */
  label?: string;
  className?: string;
};

const onError = (error: unknown) =>
  toast.error(error instanceof Error ? error.message : "홈 표시 설정에 실패했습니다.");

// 기기 탭 타일 하단 행: "홈에 표시" → 그룹 선택 모달 → 선택한 그룹으로 추가.
// 표시 중일 때도 같은 모달(그룹 변경)이 뜨고, 모달 하단의 "홈에서 숨기기"로 뺀다.
// 풀어서 보는 다구 기기는 여기서 고른 그룹으로 구별 타일이 모두 함께 옮겨진다.
// endpointId를 주면 그 구 하나만 홈에 올리고 내린다.
export function DashboardControl({
  source,
  deviceId,
  endpointIds = [],
  endpointId,
  label,
  className,
}: Props) {
  const { data, isPending, isError } = useDashboard();
  const save = useSaveLayout();
  const [picking, setPicking] = useState(false);

  const device = { source, deviceId };
  const deviceTiles = data?.items.filter((i) => sameDevice(i, device)) ?? [];
  // 구 하나를 볼 때: 그 구의 타일이거나, 기기 전체가 묶여 올라간 타일.
  const tiles =
    endpointId === undefined
      ? deviceTiles
      : deviceTiles.filter(
          (t) => t.endpointId === endpointId || t.endpointId === null,
        );
  const item = tiles[0];
  const pinned = !!item;
  const disabled = isPending || isError;
  const busy = save.isPending;
  // 구별 타일이 여러 그룹에 흩어져 있으면 그룹 이름 대신 개수를 보여준다.
  const scattered = tiles.some((t) => t.groupId !== item?.groupId);
  const groupName = scattered
    ? "여러 그룹"
    : item?.groupId != null
      ? data?.groups.find((g) => g.id === item.groupId)?.name
      : undefined;

  const mutate = (next: NonNullable<typeof data>["items"]) =>
    save.mutate(next, { onError, onSuccess: () => setPicking(false) });

  const selectGroup = (groupId: number | null) =>
    data &&
    mutate(
      endpointId === undefined
        ? setDeviceGroup(data.items, device, groupId, endpointIds)
        : setEndpointGroup(data.items, device, endpointId, groupId, endpointIds),
    );

  const handleRemove = () =>
    data &&
    mutate(
      endpointId === undefined
        ? removeDevice(data.items, device)
        : removeEndpoint(data.items, device, endpointId, endpointIds),
    );

  // 다구 기기에서 일부 구만 홈에 있으면 몇 개가 올라가 있는지 보여준다.
  const partial =
    endpointId === undefined &&
    endpointIds.length > 1 &&
    item?.endpointId !== null &&
    tiles.length < endpointIds.length;
  const what = label ?? "이 기기";

  const picker = (
    <GroupPickerDialog
      open={picking}
      onClose={() => setPicking(false)}
      groups={data?.groups ?? []}
      value={item && !scattered ? item.groupId : undefined}
      onSelect={selectGroup}
      pending={save.isPending}
      onRemove={pinned ? handleRemove : undefined}
      removePending={save.isPending}
      title={pinned ? "그룹 변경" : "홈에 표시"}
      description={
        pinned
          ? `${what}을(를) 홈 화면의 어느 그룹으로 옮길지 고릅니다.`
          : `${what}을(를) 홈 화면의 어느 그룹에 표시할지 고릅니다. 고르면 바로 홈에 추가됩니다.`
      }
    />
  );

  if (endpointId !== undefined) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setPicking(true)}
          disabled={disabled || busy}
          aria-pressed={pinned}
          aria-label={`${what} ${pinned ? "홈 표시 중" : "홈에 표시"}`}
          title={pinned ? (groupName ?? "그룹 없음") : "홈에 표시"}
          className={cn("shrink-0", pinned && "text-foreground", className)}
        >
          {busy ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Star className={cn(pinned && "fill-primary text-primary")} />
          )}
        </Button>
        {picker}
      </>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setPicking(true)}
        disabled={disabled || busy}
        aria-pressed={pinned}
        className={cn(
          pinned && "bg-accent-soft text-primary hover:bg-accent-soft",
        )}
      >
        {isPending || busy ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Star className={cn(pinned && "fill-current")} />
        )}
        {pinned
          ? partial
            ? `홈 표시 중 ${tiles.length}/${endpointIds.length}`
            : "홈 표시 중"
          : "홈에 표시"}
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

      {picker}
    </div>
  );
}
