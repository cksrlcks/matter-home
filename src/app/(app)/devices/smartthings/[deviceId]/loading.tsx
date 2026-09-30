import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// 카메라 상세: page.tsx의 2:1 그리드(실시간·스냅샷 / 전원·감지 상태)와 같은 배치
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="불러오는 중">
      <Skeleton className="mb-4 h-5 w-12" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card className="flex flex-col gap-3 p-5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="aspect-video w-full" />
          </Card>
          <Card className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
            <Skeleton className="aspect-video w-full" />
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3 p-5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-11 rounded-full" />
          </Card>
          <Card className="flex flex-col gap-2 p-5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-3/4" />
          </Card>
        </div>
      </div>
    </div>
  );
}
