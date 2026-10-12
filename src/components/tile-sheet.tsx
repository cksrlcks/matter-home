"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { EyeOff, Video } from "lucide-react";

import { Button, buttonClassName } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import {
  bundleDevice,
  removeTile,
  splitDevice,
  tileKey,
} from "@/lib/dashboard-layout";
import type { DeviceKind } from "@/lib/device-kind";
import { cn } from "@/lib/utils";
import type { DashboardGroupDto, DashboardItemDto } from "@/types/dashboard";

import { DeviceArt } from "./device-art";

type Props = {
  onClose: () => void;
  item: DashboardItemDto;
  kind: DeviceKind;
  on: boolean;
  /** 이름 영역. 이름을 바꿀 수 있는 기기는 인라인 편집 컴포넌트를 넘긴다 */
  name: ReactNode;
  caption?: string;
  groups: DashboardGroupDto[];
  items: DashboardItemDto[];
  /** 다구 기기의 구(endpoint) 목록. 2개 이상이면 묶기/풀기를 보여준다 */
  endpointIds?: number[];
  /** 카메라 등 상세 화면 경로 */
  detailHref?: string;
  onSave: (items: DashboardItemDto[]) => void;
};

const chip = (selected: boolean) =>
  cn(
    "inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold transition-colors",
    selected ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-border",
  );

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-5">
      <p className="mb-2 text-xs font-bold text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

// 타일을 길게 누르면 뜨는 상세 시트: 이름, 그룹, 묶기/풀기, 홈에서 숨기기.
export function TileSheet({
  onClose,
  item,
  kind,
  on,
  name,
  caption,
  groups,
  items,
  endpointIds = [],
  detailHref,
  onSave,
}: Props) {
  const key = tileKey(item);
  const device = { source: item.source, deviceId: item.deviceId };
  const bundled = item.endpointId === null;

  const moveTo = (groupId: number | null) =>
    onSave(items.map((i) => (tileKey(i) === key ? { ...i, groupId } : i)));

  // 묶기/풀기·숨기기는 이 타일 자체가 사라지므로 시트를 닫는다.
  const saveAndClose = (next: DashboardItemDto[]) => {
    onSave(next);
    onClose();
  };

  return (
    <Dialog open onClose={onClose}>
      <div className="flex items-center gap-3">
        <DeviceArt kind={kind} on={on} />
        <div className="min-w-0 flex-1">
          {name}
          {caption && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{caption}</p>
          )}
        </div>
      </div>

      <Section label="그룹">
        {[{ id: null as number | null, name: "그룹 없음" }, ...groups].map((group) => (
          <button
            key={group.id ?? "none"}
            type="button"
            aria-pressed={item.groupId === group.id}
            onClick={() => moveTo(group.id)}
            className={chip(item.groupId === group.id)}
          >
            {group.name}
          </button>
        ))}
      </Section>

      {endpointIds.length > 1 && (
        <Section label="보기 방식">
          <button
            type="button"
            aria-pressed={!bundled}
            onClick={() =>
              bundled && saveAndClose(splitDevice(items, device, endpointIds))
            }
            className={chip(!bundled)}
          >
            풀어서 보기
          </button>
          <button
            type="button"
            aria-pressed={bundled}
            onClick={() => !bundled && saveAndClose(bundleDevice(items, device))}
            className={chip(bundled)}
          >
            묶어서 보기
          </button>
        </Section>
      )}

      {detailHref && (
        <Link
          href={detailHref}
          className={buttonClassName({ variant: "outline", className: "mt-5 w-full" })}
        >
          <Video />
          실시간 보기
        </Link>
      )}

      <DialogFooter className="justify-between">
        <Button
          variant="ghost"
          onClick={() => saveAndClose(removeTile(items, key))}
          className="text-danger hover:bg-danger/10 hover:text-danger"
        >
          <EyeOff />
          홈에서 숨기기
        </Button>
        <Button variant="outline" onClick={onClose}>
          닫기
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
