"use client";

import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/hooks/use-confirm";
import { useRemoveDevice } from "@/hooks/use-devices";

type Props = {
  nodeId: string;
  name: string;
};

export function RemoveDeviceButton({ nodeId, name }: Props) {
  const confirm = useConfirm();
  const remove = useRemoveDevice();

  const handleRemove = async () => {
    const ok = await confirm(
      "기기를 삭제할까요?",
      `'${name}'을(를) fabric에서 제거합니다. 다시 사용하려면 재페어링이 필요합니다.`,
      { okLabel: "삭제", destructive: true },
    );
    if (!ok) return;

    remove.mutate(nodeId, {
      onSuccess: () => toast.success("기기를 삭제했습니다."),
      onError: (error) =>
        toast.error(
          error instanceof Error ? error.message : "기기 제거에 실패했습니다.",
        ),
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleRemove}
      disabled={remove.isPending}
      aria-label="기기 삭제"
      className="hover:bg-danger/10 hover:text-danger"
    >
      {remove.isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
    </Button>
  );
}
