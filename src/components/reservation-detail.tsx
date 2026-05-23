"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Clock, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ReservationDetails = {
  reservation: {
    id: string;
    productId: string;
    warehouseId: string;
    quantity: number;
    status: "PENDING" | "CONFIRMED" | "RELEASED";
    expiresAt: string;
    confirmedAt: string | null;
    releasedAt: string | null;
    createdAt: string;
  };
  product: { id: string; name: string; sku: string };
  warehouse: { id: string; name: string };
  remainingSeconds: number;
  expired: boolean;
};

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function statusVariant(
  status: ReservationDetails["reservation"]["status"],
): "default" | "success" | "secondary" | "destructive" | "warning" {
  switch (status) {
    case "CONFIRMED":
      return "success";
    case "RELEASED":
      return "secondary";
    default:
      return "warning";
  }
}

export function ReservationDetail({ id }: { id: string }) {
  const router = useRouter();
  const [details, setDetails] = useState<ReservationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const loadDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/reservations/${id}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load reservation");
      }
      setDetails(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load reservation",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadDetails();
    const interval = setInterval(() => {
      void loadDetails();
    }, 3000);
    return () => clearInterval(interval);
  }, [loadDetails]);

  useEffect(() => {
    if (!details || details.reservation.status !== "PENDING") return;

    const tick = setInterval(() => {
      setDetails((prev) => {
        if (!prev) return prev;
        const next = Math.max(0, prev.remainingSeconds - 1);
        return { ...prev, remainingSeconds: next, expired: next === 0 };
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [details?.reservation.status, details?.reservation.id]);

  async function handleConfirm() {
    setActing(true);
    try {
      const res = await fetch(`/api/reservations/${id}/confirm`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.status === 410) {
        toast.error(data.error ?? "Reservation expired");
        await loadDetails();
        return;
      }

      if (!res.ok) {
        if (res.status === 409) {
          toast.error(data.error ?? "Could not confirm reservation");
          return;
        }
        throw new Error(data.error ?? "Failed to confirm");
      }

      toast.success("Purchase confirmed — stock decremented");
      await loadDetails();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to confirm",
      );
    } finally {
      setActing(false);
    }
  }

  async function handleRelease() {
    setActing(true);
    try {
      const res = await fetch(`/api/reservations/${id}/release`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to release reservation");
      }

      toast.success("Reservation cancelled — stock released");
      await loadDetails();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel",
      );
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading reservation...</p>
    );
  }

  if (!details) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Reservation not found.</p>
        <Button variant="outline" onClick={() => router.push("/")}>
          Back to catalog
        </Button>
      </div>
    );
  }

  const { reservation, product, warehouse, remainingSeconds, expired } =
    details;
  const isPending = reservation.status === "PENDING";
  const showExpired = isPending && (expired || remainingSeconds === 0);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to catalog
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle>{product.name}</CardTitle>
              <CardDescription className="font-mono">{product.sku}</CardDescription>
            </div>
            <Badge variant={statusVariant(reservation.status)}>
              {reservation.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-muted-foreground">Warehouse</p>
              <p className="font-medium">{warehouse.name}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-muted-foreground">Quantity</p>
              <p className="font-medium">{reservation.quantity} units</p>
            </div>
          </div>

          {isPending && (
            <div
              className={`flex items-center gap-3 rounded-lg border p-4 ${
                showExpired
                  ? "border-destructive/50 bg-destructive/5"
                  : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
              }`}
            >
              <Clock
                className={`h-5 w-5 ${showExpired ? "text-destructive" : "text-amber-600"}`}
              />
              <div>
                <p className="text-sm font-medium">
                  {showExpired ? "Reservation expired" : "Time remaining"}
                </p>
                <p
                  className={`font-mono text-2xl font-semibold tabular-nums ${
                    showExpired ? "text-destructive" : ""
                  }`}
                >
                  {showExpired
                    ? "0:00"
                    : formatCountdown(remainingSeconds)}
                </p>
              </div>
            </div>
          )}

          {reservation.status === "CONFIRMED" && (
            <p className="text-sm text-muted-foreground">
              Confirmed at{" "}
              {new Date(reservation.confirmedAt!).toLocaleString()}
            </p>
          )}

          {reservation.status === "RELEASED" && (
            <p className="text-sm text-muted-foreground">
              Released at{" "}
              {new Date(reservation.releasedAt!).toLocaleString()}
            </p>
          )}

          {isPending && !showExpired && (
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => void handleConfirm()}
                disabled={acting}
              >
                <Package className="h-4 w-4" />
                Confirm purchase
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => void handleRelease()}
                disabled={acting}
              >
                Cancel reservation
              </Button>
            </div>
          )}

          {showExpired && (
            <p className="text-sm text-destructive">
              This hold has expired and stock was returned to available inventory.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
