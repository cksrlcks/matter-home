"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/hooks/use-confirm";
import {
  useCreateGroup,
  useDashboard,
  useDeleteGroup,
  useRenameGroup,
} from "@/hooks/use-dashboard";
import { cn } from "@/lib/utils";
import {
  groupNameSchema,
  type GroupNameValues,
} from "@/lib/validations/dashboard";
import type { DashboardGroupDto } from "@/types/dashboard";

type Props = {
  className?: string;
};

// 그룹관리 페이지: 메인 화면 그룹 목록 + 추가(모달) / 이름 변경 / 삭제
export function GroupManager({ className }: Props) {
  const { data, isPending, isError, error } = useDashboard();
  const [adding, setAdding] = useState(false);

  const countByGroup = new Map<number, number>();
  for (const item of data?.items ?? []) {
    if (item.groupId !== null) {
      countByGroup.set(item.groupId, (countByGroup.get(item.groupId) ?? 0) + 1);
    }
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-[-.01em]">메인 화면 그룹</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            기기관리에서 ‘메인에 표시’를 켠 기기를 그룹으로 묶어 메인에
            보여줍니다. 설정은 집 전체가 함께 사용합니다.
          </p>
        </div>
        <Button onClick={() => setAdding(true)} className="shrink-0">
          <Plus />
          그룹 추가
        </Button>
      </div>

      {isPending ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          그룹을 불러오는 중...
        </div>
      ) : isError ? (
        <p className="text-sm text-danger">
          {error instanceof Error ? error.message : "그룹을 불러오지 못했습니다."}
        </p>
      ) : data.groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
          <b className="mb-1 block text-base font-semibold text-foreground">
            아직 그룹이 없습니다
          </b>
          ‘그룹 추가’로 거실·서재 같은 그룹을 만들어 보세요.
        </div>
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {data.groups.map((group) => (
              <GroupRow
                key={group.id}
                group={group}
                count={countByGroup.get(group.id) ?? 0}
              />
            ))}
          </ul>
        </Card>
      )}

      <AddGroupDialog open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

type AddGroupDialogProps = {
  open: boolean;
  onClose: () => void;
};

function AddGroupDialog({ open, onClose }: AddGroupDialogProps) {
  const create = useCreateGroup();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GroupNameValues>({
    resolver: zodResolver(groupNameSchema),
    defaultValues: { name: "" },
  });

  const close = () => {
    reset();
    onClose();
  };

  const onSubmit = handleSubmit(({ name }) =>
    create.mutateAsync(name).then(
      () => {
        toast.success("그룹을 추가했습니다.");
        close();
      },
      (err) =>
        toast.error(err instanceof Error ? err.message : "그룹 생성에 실패했습니다."),
    ),
  );

  return (
    <Dialog open={open} onClose={close}>
      <form onSubmit={onSubmit}>
        <DialogHeader
          title="그룹 추가"
          description="메인 화면에서 기기를 묶어 보여줄 그룹 이름입니다."
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="group-name">그룹 이름</Label>
          <Input
            id="group-name"
            autoFocus
            placeholder="예: 거실"
            maxLength={32}
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-danger">{errors.name.message}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            취소
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending && <Loader2 className="animate-spin" />}
            추가
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

type GroupRowProps = {
  group: DashboardGroupDto;
  count: number;
};

function GroupRow({ group, count }: GroupRowProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(group.name);
  const rename = useRenameGroup();
  const remove = useDeleteGroup();
  const confirm = useConfirm();

  const startEdit = () => {
    setValue(group.name);
    setEditing(true);
  };

  const submit = () => {
    const parsed = groupNameSchema.safeParse({ name: value });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "그룹 이름이 올바르지 않습니다.");
      return;
    }
    setEditing(false);
    if (parsed.data.name === group.name) return;
    rename.mutate(
      { id: group.id, name: parsed.data.name },
      {
        onSuccess: () => toast.success("그룹 이름을 변경했습니다."),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "그룹 이름 변경에 실패했습니다."),
      },
    );
  };

  const handleDelete = async () => {
    const ok = await confirm(
      `'${group.name}' 그룹을 삭제하시겠습니까?`,
      "그룹에 속한 기기는 메인에 그대로 남고, 그룹만 해제됩니다.",
      { okLabel: "삭제", destructive: true },
    );
    if (!ok) return;
    remove.mutate(group.id, {
      onSuccess: () => toast.success("그룹을 삭제했습니다."),
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "그룹 삭제에 실패했습니다."),
    });
  };

  if (editing) {
    return (
      <li className="flex items-center gap-1.5 px-4 py-2.5">
        <Input
          autoFocus
          value={value}
          maxLength={32}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") setEditing(false);
          }}
          className="h-9"
        />
        <Button size="icon-sm" onClick={submit} aria-label="저장">
          <Check />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setEditing(false)}
          aria-label="취소"
        >
          <X />
        </Button>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2 px-4 py-3">
      <span className="min-w-0 flex-1 truncate font-medium">{group.name}</span>
      <span className="shrink-0 text-xs text-muted-foreground">기기 {count}개</span>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={startEdit}
        aria-label="그룹 이름 변경"
      >
        <Pencil className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleDelete}
        disabled={remove.isPending}
        aria-label="그룹 삭제"
        className="hover:bg-danger/10 hover:text-danger"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </li>
  );
}
