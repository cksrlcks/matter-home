import { Card } from "@/components/ui/card";
import { Skeleton, TileSkeleton } from "@/components/ui/skeleton";

// 메인: 전력 사용량 카드 + 그룹 섹션 1개 분량의 타일
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="불러오는 중">
      <Card className="mb-6 flex items-center justify-between gap-3 p-5">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-32" />
      </Card>
      <section className="flex flex-col gap-3">
        <Skeleton className="h-6 w-28" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <TileSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
