"use client";

import { useCallback, useEffect, useState } from "react";
import { Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { apiFetch } from "@/hooks/use-api";
import { formatMoney } from "@/config/plans";
import type { Paginated } from "@/lib/api/response";
import type { PaymentRow } from "@/types/database";

type PaymentItem = Pick<
  PaymentRow,
  "id" | "reference" | "purpose" | "plan_id" | "billing_interval" | "amount" | "currency" | "status" | "channel" | "paid_at" | "created_at"
>;

const STATUS_CLASS: Record<string, string> = {
  success: "border-success/40 text-success",
  pending: "border-warning/50 text-warning",
  failed: "border-destructive/40 text-destructive",
  abandoned: "text-muted-foreground",
  refunded: "text-muted-foreground",
};

export function PaymentHistory({ planNames }: { planNames: Record<string, string> }) {
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<{ key: string; data: Paginated<PaymentItem> | null; error: string | null } | null>(null);
  const requestKey = `${page}:${reloadKey}`;

  useEffect(() => {
    let cancelled = false;
    apiFetch<Paginated<PaymentItem>>(`/api/billing/payments?page=${page}&pageSize=10`).then((res) => {
      if (cancelled) return;
      setResult((prev) =>
        res.ok ? { key: requestKey, data: res.data, error: null } : { key: requestKey, data: prev?.data ?? null, error: res.error.message },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [page, requestKey]);

  const loading = result?.key !== requestKey;
  const data = result?.data ?? null;
  const error = loading ? null : result?.error ?? null;
  const load = useCallback(() => setReloadKey((k) => k + 1), []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Payment history</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && !data ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="text-destructive text-sm">
            {error}{" "}
            <button className="underline" onClick={load}>
              Retry
            </button>
          </p>
        ) : !data?.items.length ? (
          <EmptyState icon={Receipt} title="No payments yet" description="Your invoices and receipts will appear here." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="whitespace-nowrap">{new Date(p.paid_at ?? p.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {p.plan_id ? planNames[p.plan_id] ?? p.plan_id : "—"}
                        <span className="text-muted-foreground text-xs">
                          {p.billing_interval ? ` · ${p.billing_interval}` : ""}
                          {p.purpose === "renewal" ? " · renewal" : ""}
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums">{formatMoney(p.amount, p.currency)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_CLASS[p.status]}>
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden font-mono text-xs md:table-cell">{p.reference}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {data.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-end gap-2 text-sm">
                <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <span className="text-muted-foreground tabular-nums">
                  {page} / {data.totalPages}
                </span>
                <Button size="sm" variant="outline" disabled={page >= data.totalPages || loading} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
