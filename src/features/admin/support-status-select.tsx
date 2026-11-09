"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { OptionSelect } from "@/components/forms/option-select";
import { apiFetch, toastError } from "@/hooks/use-api";

export function SupportStatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  return (
    <OptionSelect
      className="w-36"
      value={value}
      onChange={async (next) => {
        const prev = value;
        setValue(next);
        const res = await apiFetch(`/api/admin/support/${id}`, { method: "PATCH", json: { status: next } });
        if (!res.ok) {
          setValue(prev);
          return toastError(res.error);
        }
        toast.success("Status updated");
        router.refresh();
      }}
      options={[
        { value: "open", label: "Open" },
        { value: "in_progress", label: "In progress" },
        { value: "resolved", label: "Resolved" },
      ]}
    />
  );
}
