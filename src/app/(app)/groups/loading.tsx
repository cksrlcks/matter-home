import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// 그룹관리: 헤더(제목 + 추가 버튼) + 그룹 목록 카드
export default function Loading() {
  return (
    <div
      aria-busy="true"
      aria-label="불러오는 중"
      className="flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <Card>
        <ul className="divide-y divide-border">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="flex items-center justify-between gap-3 p-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-8 w-20" />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
