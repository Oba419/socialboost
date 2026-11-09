"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch, toastError } from "@/hooks/use-api";
import { ReasonDialog } from "./reason-dialog";

export function UserStatusControl({ userId, status }: { userId: string; status: "active" | "suspended" }) {
  const router = useRouter();
  const suspend = status === "active";
  return (
    <ReasonDialog
      trigger={
        <Button size="sm" variant={suspend ? "destructive" : "outline"} className="w-full">
          {suspend ? "Suspend account" : "Reinstate account"}
        </Button>
      }
      title={suspend ? "Suspend this account?" : "Reinstate this account?"}
      description={
        suspend
          ? "The user will be signed out and blocked from signing in until reinstated. Their data is kept."
          : "The user will be able to sign in again."
      }
      confirmLabel={suspend ? "Suspend" : "Reinstate"}
      destructive={suspend}
      onConfirm={async (reason) => {
        const res = await apiFetch(`/api/admin/users/${userId}/status`, {
          method: "POST",
          json: { status: suspend ? "suspended" : "active", reason },
        });
        if (!res.ok) {
          toastError(res.error);
          return false;
        }
        toast.success(suspend ? "Account suspended" : "Account reinstated");
        router.refresh();
        return true;
      }}
    />
  );
}
