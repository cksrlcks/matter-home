"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Wifi } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useRemoveWifi, useSaveWifi, useWifi } from "@/hooks/use-wifi";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const wifiSchema = z.object({
  ssid: z.string().trim().min(1, "Wi-Fi 이름(SSID)을 입력해주세요.").max(32),
  password: z.string().max(64),
});

type WifiValues = z.infer<typeof wifiSchema>;

export function WifiSettingsButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Wifi className="h-4 w-4" />
        설정
      </Button>
      {/* Dialog는 닫히면 children을 렌더하지 않으므로 폼 상태는 닫을 때마다 초기화된다. */}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <WifiForm onClose={() => setOpen(false)} />
      </Dialog>
    </>
  );
}

// Wi-Fi Matter 기기를 추가할 때 기기에 넘겨줄 집 Wi-Fi. 비밀번호는 matter-server로만 전달된다.
function WifiForm({ onClose }: { onClose: () => void }) {
  const wifi = useWifi(true);
  const save = useSaveWifi();
  const remove = useRemoveWifi();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<WifiValues>({
    resolver: zodResolver(wifiSchema),
    defaultValues: { ssid: "", password: "" },
  });

  const pending = save.isPending || remove.isPending;
  const savedSsid = wifi.data?.ssid ?? null;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await save.mutateAsync(values);
      toast.success(`'${values.ssid.trim()}' Wi-Fi를 저장했습니다.`);
      onClose();
    } catch (error) {
      setError("root", {
        message:
          error instanceof Error ? error.message : "Wi-Fi 저장에 실패했습니다.",
      });
    }
  });

  const handleRemove = async () => {
    try {
      await remove.mutateAsync();
      toast.success("저장된 Wi-Fi를 삭제했습니다.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Wi-Fi 삭제에 실패했습니다.",
      );
    }
  };

  return (
    <>
      <DialogHeader
        title="Wi-Fi 설정"
        description="Wi-Fi 방식 Matter 기기를 추가할 때 기기에 전달할 집 Wi-Fi입니다. 2.4GHz 네트워크를 입력해주세요."
      />

      <div className="mb-4 flex items-center justify-between gap-2 rounded-lg bg-muted px-4 py-3 text-sm">
        <span className="min-w-0 truncate text-muted-foreground">
          {wifi.isPending ? (
            "저장된 Wi-Fi 확인 중..."
          ) : wifi.isError ? (
            "저장된 Wi-Fi를 확인하지 못했습니다."
          ) : savedSsid ? (
            <>
              저장됨:{" "}
              <span className="font-semibold text-foreground">{savedSsid}</span>
            </>
          ) : (
            "저장된 Wi-Fi가 없습니다."
          )}
        </span>
        {savedSsid && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={pending}
          >
            삭제
          </Button>
        )}
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wifi-ssid">Wi-Fi 이름 (SSID)</Label>
          <Input
            id="wifi-ssid"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            disabled={pending}
            {...register("ssid")}
          />
          {errors.ssid && (
            <p className="text-sm text-danger">{errors.ssid.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wifi-password">비밀번호</Label>
          <Input
            id="wifi-password"
            type="password"
            autoComplete="off"
            disabled={pending}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-sm text-danger">{errors.password.message}</p>
          )}
        </div>

        {errors.root && (
          <p className="text-sm text-danger">{errors.root.message}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            닫기
          </Button>
          <Button type="submit" disabled={pending}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            저장
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
