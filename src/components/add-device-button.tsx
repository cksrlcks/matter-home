"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { CommissionDialog } from "@/components/commission-dialog";
import { Button } from "@/components/ui/button";

export function AddDeviceButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        기기 추가
      </Button>
      <CommissionDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
