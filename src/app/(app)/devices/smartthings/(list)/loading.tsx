import { TileGridSkeleton } from "@/components/ui/skeleton";

// SmartThings 기기관리: SmartThings API 응답(기기 + 스위치 상태)을 기다리는 동안
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="불러오는 중">
      <TileGridSkeleton />
    </div>
  );
}
