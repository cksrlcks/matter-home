"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowUpDown, Check, Ellipsis, Minus } from "lucide-react";
import { toast } from "sonner";

import { setSwitchAction } from "@/app/(app)/devices/smartthings/actions";
import { Button, buttonClassName } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard, useSaveLayout } from "@/hooks/use-dashboard";
import { useDevices, usePowerMutation } from "@/hooks/use-devices";
import { removeTile, tileKey } from "@/lib/dashboard-layout";
import { matterKind, type DeviceKind } from "@/lib/device-kind";
import { formatWatts } from "@/lib/energy";
import { cn } from "@/lib/utils";
import type { DashboardDto, DashboardItemDto } from "@/types/dashboard";
import type { SmartThingsTileDto } from "@/types/home";
import type { DeviceDto, DeviceSwitchDto } from "@/types/matter";

import { DeviceArt, SceneArt } from "./device-art";
import { DeviceName, SmartThingsDeviceName, SwitchName } from "./device-name";
import { EnergySummary } from "./energy-summary";
import { PageHeader } from "./page-header";
import {
  HomeTile,
  tileAccentClass,
  tileSurfaceClass,
  type HomeTileState,
} from "./home-tile";
import { TileSheet } from "./tile-sheet";

type Props = {
  initialDashboard: DashboardDto;
  /** 홈에 올린 SmartThings 기기 (deviceId → 타일 정보) */
  smartThings: Record<string, SmartThingsTileDto>;
};

// 타일 하나를 화면에 그리기 위해 풀어낸 정보
type Tile = {
  kind: DeviceKind;
  title: string;
  /** 편집 모드·시트에서 보여줄 보조 설명 (소속 기기 등) */
  caption: string;
  state: HomeTileState;
  /** 켜져 있는 스위치 수 (상단 요약용) */
  onCount: number;
} & (
  | { type: "single"; subtitle: string; pending?: boolean; onPress?: () => void }
  | { type: "bundle"; device: DeviceDto }
  | { type: "loading" }
  | { type: "missing" }
);

const NO_GROUP = "group:none";
const ST_REFRESH_INTERVAL_MS = 10_000;
// 방금 누른 값을 유지하는 시간. 새로고침 주기보다 길어야 늦은 서버값에 안 밀린다.
const ST_PENDING_TTL = 15_000;
const containerId = (groupId: number | null) =>
  groupId === null ? NO_GROUP : `group:${groupId}`;
const containerGroupId = (id: string) =>
  id === NO_GROUP ? null : Number(id.slice("group:".length));
const isContainer = (id: UniqueIdentifier) => String(id).startsWith("group:");

// 포인터가 올라가 있는 타일을 우선하고, 타일이 없으면(빈 그룹) 그룹 영역을 고른다.
const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const tiles = hits.filter((hit) => !isContainer(hit.id));
  if (tiles.length > 0) return tiles;
  return hits.length > 0 ? hits : closestCenter(args);
};

export function HomeBoard({ initialDashboard, smartThings }: Props) {
  const router = useRouter();
  const { data: dashboard = initialDashboard } = useDashboard(initialDashboard);
  const devices = useDevices();
  const power = usePowerMutation();
  const save = useSaveLayout();

  // 편집 모드에서는 끌고 있는 동안의 배치를 draft에 두고, 놓을 때마다 저장한다.
  const [draft, setDraft] = useState<DashboardItemDto[] | null>(null);
  const [sheetKey, setSheetKey] = useState<string | null>(null);
  // SmartThings 스위치는 서버가 내려준 상태 위에 방금 누른 값을 잠깐(ST_PENDING_TTL) 덮어쓴다.
  // 영구히 덮으면 벽 스위치·다른 앱으로 바뀐 값을 못 따라간다.
  const [stState, setStState] = useState<Record<string, boolean>>({});
  const [stPending, setStPending] = useState<Record<string, boolean>>({});
  const editing = draft !== null;

  // SmartThings 상태는 서버 렌더에서만 읽힌다. 앱을 다시 열었을 때(백그라운드 복귀)와
  // 주기적으로 서버 데이터를 다시 받아 오래된 상태가 남지 않게 한다.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(refresh, ST_REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // 폰: 잠깐 누르고 있어야 끌린다. 그 전에는 화면 스크롤이 그대로 된다.
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const commit = (next: DashboardItemDto[]) =>
    save.mutate(next, {
      onError: (error) => {
        toast.error(
          error instanceof Error ? error.message : "메인 구성 저장에 실패했습니다.",
        );
        setDraft(null);
      },
    });

  const toggleMatter = (nodeId: string, sw: DeviceSwitchDto) =>
    power.mutate(
      { nodeId, endpointId: sw.endpointId, state: !sw.on },
      {
        onError: (error) =>
          toast.error(
            error instanceof Error ? error.message : "기기 제어에 실패했습니다.",
          ),
      },
    );

  const toggleSmartThings = async (deviceId: string, next: boolean) => {
    setStPending((prev) => ({ ...prev, [deviceId]: true }));
    try {
      await setSwitchAction(deviceId, next);
      setStState((prev) => ({ ...prev, [deviceId]: next }));
      router.refresh();
      setTimeout(
        () =>
          setStState((prev) => {
            if (prev[deviceId] !== next) return prev;
            const rest = { ...prev };
            delete rest[deviceId];
            return rest;
          }),
        ST_PENDING_TTL,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "기기 제어에 실패했습니다.");
    } finally {
      setStPending((prev) => ({ ...prev, [deviceId]: false }));
    }
  };

  const missing = (title: string, caption: string): Tile => ({
    type: "missing",
    kind: "other",
    title,
    caption,
    state: "offline",
    onCount: 0,
  });

  const resolveMatter = (item: DashboardItemDto): Tile => {
    if (devices.isPending) {
      return {
        type: "loading",
        kind: "other",
        title: "불러오는 중",
        caption: "Matter",
        state: "off",
        onCount: 0,
      };
    }
    const device = devices.data?.find((d) => d.nodeId === item.deviceId);
    if (!device) {
      return missing(
        "찾을 수 없는 기기",
        devices.isError ? "Matter 기기를 불러오지 못했습니다." : "등록되지 않은 Matter 기기입니다.",
      );
    }

    const single = (sw: DeviceSwitchDto | undefined, title: string, caption: string): Tile => {
      const kind = matterKind(device, item.endpointId === null ? undefined : sw);
      const state = !device.online ? "offline" : sw?.on ? "on" : "off";
      const watts =
        item.endpointId === null && device.energy && device.online
          ? formatWatts(device.energy.activePowerW)
          : null;
      const label = !device.online
        ? "오프라인"
        : !sw
          ? "On/Off 미지원"
          : sw.on
            ? "켜짐"
            : "꺼짐";
      return {
        type: "single",
        kind,
        title,
        caption,
        state,
        subtitle: [label, watts].filter(Boolean).join(" · "),
        pending: sw?.pending,
        onPress:
          sw && device.online ? () => toggleMatter(device.nodeId, sw) : undefined,
        onCount: state === "on" ? 1 : 0,
      };
    };

    if (item.endpointId !== null) {
      const sw = device.switches.find((s) => s.endpointId === item.endpointId);
      if (!sw) return missing("찾을 수 없는 스위치", device.name);
      return single(sw, sw.name, device.name);
    }
    if (device.switches.length > 1) {
      const onCount = device.online ? device.switches.filter((s) => s.on).length : 0;
      return {
        type: "bundle",
        kind: matterKind(device),
        title: device.name,
        caption: `${device.switches.length}구 묶음`,
        state: !device.online ? "offline" : onCount > 0 ? "on" : "off",
        device,
        onCount,
      };
    }
    return single(device.switches[0], device.name, device.vendorName ?? "Matter");
  };

  const resolveSmartThings = (item: DashboardItemDto): Tile => {
    const entry = smartThings[item.deviceId];
    if (!entry) return missing("찾을 수 없는 기기", "SmartThings 기기를 불러오지 못했습니다.");
    if ("error" in entry) return missing("찾을 수 없는 기기", entry.error);

    const base = { type: "single" as const, kind: entry.kind, title: entry.name, caption: "SmartThings" };
    // 켜고 끌 수 없는 기기(카메라 등)는 누르면 상세 화면으로 간다.
    if (entry.switchOn === undefined) {
      return {
        ...base,
        state: "on",
        subtitle: entry.camera ? "실시간 보기" : "SmartThings",
        onPress: entry.camera
          ? () => router.push(`/devices/smartthings/${item.deviceId}`)
          : undefined,
        onCount: 0,
      };
    }
    const on = stState[item.deviceId] ?? entry.switchOn;
    if (on === null) {
      return { ...base, state: "offline", subtitle: "상태 없음", onCount: 0 };
    }
    return {
      ...base,
      state: on ? "on" : "off",
      subtitle: on ? "켜짐" : "꺼짐",
      pending: stPending[item.deviceId],
      onPress: () => toggleSmartThings(item.deviceId, !on),
      onCount: on ? 1 : 0,
    };
  };

  const resolve = (item: DashboardItemDto) =>
    item.source === "matter" ? resolveMatter(item) : resolveSmartThings(item);

  // 삭제된 그룹을 가리키는 타일은 그룹 없음으로 본다.
  const groupIds = new Set(dashboard.groups.map((g) => g.id));
  const items = (draft ?? dashboard.items).map((item) =>
    item.groupId !== null && !groupIds.has(item.groupId)
      ? { ...item, groupId: null }
      : item,
  );
  const tiles = new Map(items.map((item) => [tileKey(item), resolve(item)]));
  const onCount = [...tiles.values()].reduce((sum, tile) => sum + tile.onCount, 0);

  // 그룹 순서대로, 그룹 없는 타일은 맨 뒤. 평소에는 빈 그룹을 숨기고 편집 중에는 모두 보여준다.
  const sections = [
    ...dashboard.groups.map((g) => ({ groupId: g.id as number | null, title: g.name })),
    { groupId: null, title: dashboard.groups.length > 0 ? "기타" : "" },
  ]
    .map((section) => ({
      ...section,
      items: items.filter((item) => item.groupId === section.groupId),
    }))
    .filter((section) => editing || section.items.length > 0);

  const containerOf = (id: UniqueIdentifier) => {
    if (isContainer(id)) return String(id);
    const item = items.find((i) => tileKey(i) === id);
    return item ? containerId(item.groupId) : null;
  };

  // 다른 그룹 위로 끌고 가면 그 그룹으로 옮겨 넣는다. (저장은 놓을 때)
  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const from = containerOf(active.id);
    const to = containerOf(over.id);
    if (!from || !to || from === to) return;
    const activeIndex = items.findIndex((i) => tileKey(i) === active.id);
    if (activeIndex < 0) return;
    const moved = { ...items[activeIndex], groupId: containerGroupId(to) };
    const rest = items.filter((_, index) => index !== activeIndex);
    const overIndex = rest.findIndex((i) => tileKey(i) === over.id);
    const insertAt = overIndex >= 0 ? overIndex : rest.length;
    setDraft([...rest.slice(0, insertAt), moved, ...rest.slice(insertAt)]);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    let next = items;
    if (over && active.id !== over.id) {
      const from = items.findIndex((i) => tileKey(i) === active.id);
      const to = items.findIndex((i) => tileKey(i) === over.id);
      if (from >= 0 && to >= 0) next = arrayMove(items, from, to);
    }
    setDraft(next);
    commit(next);
  };

  const hide = (key: string) => {
    const next = removeTile(items, key);
    setDraft(next);
    commit(next);
  };

  const sheetItem = sheetKey ? items.find((i) => tileKey(i) === sheetKey) : undefined;
  const sheetTile = sheetKey ? tiles.get(sheetKey) : undefined;

  const renderTile = (item: DashboardItemDto) => {
    const key = tileKey(item);
    const tile = tiles.get(key)!;
    const openSheet = () => setSheetKey(key);

    if (tile.type === "loading") {
      return <Skeleton key={key} className="min-h-40 rounded-[22px]" />;
    }
    if (tile.type === "bundle") {
      return (
        <BundleTile
          key={key}
          tile={tile}
          device={tile.device}
          onToggle={(sw) => toggleMatter(tile.device.nodeId, sw)}
          onMore={openSheet}
        />
      );
    }
    return (
      <HomeTile
        key={key}
        kind={tile.kind}
        state={tile.state}
        title={tile.title}
        subtitle={tile.type === "missing" ? tile.caption : tile.subtitle}
        pending={tile.type === "single" ? tile.pending : undefined}
        onPress={tile.type === "single" ? tile.onPress : undefined}
        onMore={openSheet}
      />
    );
  };

  return (
    <>
      <PageHeader
        title="우리집"
        description={
          editing
            ? "타일을 끌어서 순서와 그룹을 바꿔요"
            : onCount > 0
              ? `${onCount}개 켜져 있어요`
              : "모두 꺼져 있어요"
        }
        actions={
          editing ? (
            <Button onClick={() => setDraft(null)}>
              <Check />
              완료
            </Button>
          ) : (
            items.length > 0 && (
              <Button variant="outline" onClick={() => setDraft(dashboard.items)}>
                <ArrowUpDown />
                편집
              </Button>
            )
          )
        }
      />

      {!editing && <EnergySummary />}

      {items.length === 0 && !editing ? (
        <div className="flex flex-col items-center gap-3 rounded-[22px] bg-card px-6 py-10 text-center">
          <SceneArt scene="empty" className="size-28" />
          <h2 className="text-xl">아직 홈이 비어 있어요</h2>
          <p className="text-sm text-muted-foreground">
            기기 탭에서 홈에 올릴 기기를 골라 주세요.
          </p>
          <Link href="/devices" className={buttonClassName()}>
            기기 고르러 가기
          </Link>
        </div>
      ) : editing ? (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-col gap-8">
            {sections.map((section) => (
              <EditSection
                key={containerId(section.groupId)}
                id={containerId(section.groupId)}
                title={section.title || "그룹 없음"}
                keys={section.items.map(tileKey)}
              >
                {section.items.map((item) => {
                  const key = tileKey(item);
                  const tile = tiles.get(key)!;
                  return (
                    <EditTile
                      key={key}
                      id={key}
                      tile={tile}
                      onRemove={() => hide(key)}
                    />
                  );
                })}
              </EditSection>
            ))}
          </div>
        </DndContext>
      ) : (
        <div className="flex flex-col gap-8">
          {sections.map((section) => (
            <section key={containerId(section.groupId)} className="flex flex-col gap-3">
              {section.title && <SectionTitle title={section.title} count={section.items.length} />}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {section.items.map(renderTile)}
              </div>
            </section>
          ))}
        </div>
      )}

      {sheetItem && sheetTile && !editing && (
        <TileSheet
          onClose={() => setSheetKey(null)}
          item={sheetItem}
          kind={sheetTile.kind}
          on={sheetTile.state === "on"}
          name={<SheetName item={sheetItem} tile={sheetTile} devices={devices.data} smartThings={smartThings} />}
          caption={sheetTile.caption}
          groups={dashboard.groups}
          items={items}
          endpointIds={
            sheetItem.source === "matter"
              ? devices.data
                  ?.find((d) => d.nodeId === sheetItem.deviceId)
                  ?.switches.map((s) => s.endpointId)
              : undefined
          }
          detailHref={
            sheetItem.source === "smartthings" &&
            (() => {
              const entry = smartThings[sheetItem.deviceId];
              return entry && !("error" in entry) && entry.camera;
            })()
              ? `/devices/smartthings/${sheetItem.deviceId}`
              : undefined
          }
          onSave={commit}
        />
      )}
    </>
  );
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <h2 className="flex items-baseline gap-2 text-[22px]">
      {title}
      <span className="text-sm font-semibold text-muted-foreground">{count}</span>
    </h2>
  );
}

// 시트 상단 이름. 이름을 바꿀 수 있는 기기는 인라인 편집을 그대로 쓴다.
function SheetName({
  item,
  tile,
  devices,
  smartThings,
}: {
  item: DashboardItemDto;
  tile: Tile;
  devices: DeviceDto[] | undefined;
  smartThings: Record<string, SmartThingsTileDto>;
}) {
  const fallback = <h2 className="truncate text-lg">{tile.title}</h2>;
  if (tile.type === "missing" || tile.type === "loading") return fallback;

  if (item.source === "smartthings") {
    const entry = smartThings[item.deviceId];
    if (!entry || "error" in entry) return fallback;
    return (
      <SmartThingsDeviceName
        deviceId={item.deviceId}
        name={entry.name}
        smartThingsName={entry.defaultName}
        customName={entry.customName}
      />
    );
  }

  const device = devices?.find((d) => d.nodeId === item.deviceId);
  if (!device) return fallback;
  const sw =
    item.endpointId === null
      ? undefined
      : device.switches.find((s) => s.endpointId === item.endpointId);
  if (sw) {
    return (
      <SwitchName
        nodeId={device.nodeId}
        endpointId={sw.endpointId}
        name={sw.name}
        defaultName={sw.defaultName}
        customName={sw.customName}
      />
    );
  }
  return (
    <DeviceName
      nodeId={device.nodeId}
      name={device.name}
      matterName={device.matterName}
      customName={device.customName}
    />
  );
}

// 묶어서 보는 다구 기기: 가로 두 칸 타일 안에서 구마다 따로 켜고 끈다.
function BundleTile({
  tile,
  device,
  onToggle,
  onMore,
}: {
  tile: Tile;
  device: DeviceDto;
  onToggle: (sw: DeviceSwitchDto) => void;
  onMore: () => void;
}) {
  return (
    <div
      className={cn(
        "relative col-span-2 p-5",
        tileSurfaceClass(tile.kind, tile.state),
      )}
    >
      {/* ⋯ 는 다른 타일과 같은 자리(우상단 모서리)에 둔다. */}
      <div className="flex items-center gap-3 pr-8">
        <DeviceArt kind={tile.kind} on={tile.state === "on"} className="size-12" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] leading-tight font-bold">{tile.title}</p>
          <p
            className={cn(
              "mt-1 truncate text-sm font-semibold tabular-nums",
              tileAccentClass(tile.kind, tile.state),
            )}
          >
            {device.online
              ? `${tile.onCount}/${device.switches.length} 켜짐`
              : "오프라인"}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onMore}
        aria-label={`${tile.title} 설정`}
        className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
      >
        <Ellipsis className="size-5" strokeWidth={2.6} />
      </button>
      <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(5.5rem,1fr))] gap-2">
        {device.switches.map((sw) => (
          <button
            key={sw.endpointId}
            type="button"
            aria-pressed={sw.on}
            disabled={!device.online || sw.pending}
            onClick={() => onToggle(sw)}
            className={cn(
              "press h-11 min-w-0 truncate rounded-full px-3 text-sm font-semibold disabled:opacity-50",
              sw.on && device.online
                ? "bg-white text-black"
                : "bg-white/10 text-white/70",
            )}
          >
            {sw.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// 편집 모드의 그룹 영역. 비어 있어도 끌어다 놓을 수 있다.
function EditSection({
  id,
  title,
  keys,
  children,
}: {
  id: string;
  title: string;
  keys: string[];
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle title={title} count={keys.length} />
      <SortableContext items={keys} strategy={rectSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            "min-h-24 rounded-3xl",
            keys.length > 0
              ? "grid grid-cols-2 gap-3 sm:grid-cols-3"
              : "grid place-items-center border-2 border-dashed border-border text-sm text-muted-foreground",
            keys.length === 0 && isOver && "border-primary bg-accent-soft text-primary",
          )}
        >
          {keys.length > 0 ? children : "여기로 끌어다 놓기"}
        </div>
      </SortableContext>
    </section>
  );
}

// 편집 모드의 타일. 크기를 통일해 끌어 옮기기 쉽게 하고, 누르면 켜지지 않는다.
function EditTile({
  id,
  tile,
  onRemove,
}: {
  id: string;
  tile: Tile;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative", isDragging && "z-10")}
    >
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "flex min-h-24 cursor-grab touch-manipulation flex-col justify-end p-5 select-none [-webkit-touch-callout:none]",
          tileSurfaceClass(tile.kind, tile.state),
          isDragging ? "scale-105 cursor-grabbing shadow-lg" : "animate-wiggle",
        )}
      >
        <p className="truncate text-[15px] leading-tight font-bold">{tile.title}</p>
        <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">
          {tile.caption}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${tile.title} 홈에서 숨기기`}
        className="absolute -top-2 -left-2 grid size-7 place-items-center rounded-full bg-muted-foreground text-background shadow-md"
      >
        <Minus className="size-4" strokeWidth={3} />
      </button>
    </div>
  );
}
