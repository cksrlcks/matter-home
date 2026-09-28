"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ConfirmOptions = {
  cancelLabel?: string;
  okLabel?: string;
  /** 삭제 등 파괴적 액션이면 확인 버튼을 danger 색으로 표시 */
  destructive?: boolean;
};

type ConfirmState = Required<Omit<ConfirmOptions, "destructive">> &
  Pick<ConfirmOptions, "destructive"> & {
    title: string;
    description: string;
  };

type ConfirmFn = (
  title: string,
  description: string,
  options?: ConfirmOptions,
) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm: ConfirmFn = useCallback(
    (title, description, options) =>
      new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
        setState({
          title,
          description,
          cancelLabel: options?.cancelLabel ?? "취소",
          okLabel: options?.okLabel ?? "확인",
          destructive: options?.destructive,
        });
      }),
    [],
  );

  const close = (value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={!!state} onClose={() => close(false)}>
        {state && (
          <>
            <DialogHeader
              title={state.title}
              description={state.description}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => close(false)}>
                {state.cancelLabel}
              </Button>
              <Button
                onClick={() => close(true)}
                className={cn(
                  state.destructive &&
                    "bg-danger text-white hover:bg-danger/90",
                )}
              >
                {state.okLabel}
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
