import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: ReactNode;
  /** 제목 오른쪽 액션 (버튼 1~2개) */
  actions?: ReactNode;
};

// 각 탭 화면 상단의 큰 제목 줄
export function PageHeader({ title, description, actions }: Props) {
  return (
    <header className="mb-5 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-3xl tracking-[-.01em]">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
