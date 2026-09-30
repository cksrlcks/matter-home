import { Skeleton, TileGridSkeleton } from "@/components/ui/skeleton";

// Matter 기기관리: 기기 추가 버튼 + 기기 목록
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="불러오는 중">
      <div className="mb-4 flex justify-end">
        <Skeleton className="h-9 w-24" />
      </div>
      <TileGridSkeleton />
    </div>
  );
}
