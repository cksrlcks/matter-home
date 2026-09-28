"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useCommissionDevice } from "@/hooks/use-devices";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const commissionSchema = z.object({
  code: z.string().trim().min(8, "Matter 페어링 코드를 입력해주세요."),
});

type CommissionValues = z.infer<typeof commissionSchema>;

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CommissionDialog({ open, onClose }: Props) {
  const commission = useCommissionDevice();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CommissionValues>({
    resolver: zodResolver(commissionSchema),
    defaultValues: { code: "" },
  });

  const pending = commission.isPending;

  // 닫힐 때 입력값/에러 초기화
  useEffect(() => {
    if (!open) reset({ code: "" });
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const device = await commission.mutateAsync(values.code);
      toast.success(`'${device.name}'을(를) 추가했습니다.`);
      onClose();
    } catch (error) {
      setError("root", {
        message:
          error instanceof Error ? error.message : "기기 추가에 실패했습니다.",
      });
    }
  });

  // commissioning 중에는 임의로 닫히지 않게 한다.
  const handleClose = () => {
    if (!pending) onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogHeader
        title="Matter 기기 추가"
        description="기기를 페어링 모드로 만든 뒤 페어링 코드를 입력해주세요."
      />
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="code">Matter 페어링 코드</Label>
          <Input
            id="code"
            placeholder="0262-351-6467 또는 MT:..."
            autoComplete="off"
            autoFocus
            disabled={pending}
            {...register("code")}
          />
          {errors.code && (
            <p className="text-sm text-danger">{errors.code.message}</p>
          )}
        </div>

        {pending && (
          <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            기기를 연결하는 중입니다... (최대 몇 분 소요)
          </div>
        )}

        {errors.root && (
          <p className="text-sm text-danger">{errors.root.message}</p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={pending}
          >
            취소
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            기기 연결
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
