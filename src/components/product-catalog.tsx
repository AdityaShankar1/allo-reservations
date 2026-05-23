"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Package, Warehouse } from "lucide-react";
import type { ProductView } from "@/lib/products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ReserveTarget = {
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  availableStock: number;
};

export function ProductCatalog() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductView[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserveTarget, setReserveTarget] = useState<ReserveTarget | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [submitting, setSubmitting] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load products");
      }
      setProducts(await res.json());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load products",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  async function handleReserve() {
    if (!reserveTarget) return;

    const qty = Number.parseInt(quantity, 10);
    if (!Number.isInteger(qty) || qty < 1) {
      toast.error("Enter a valid quantity");
      return;
    }

    if (qty > reserveTarget.availableStock) {
      toast.error("Quantity exceeds available stock");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: reserveTarget.productId,
          warehouseId: reserveTarget.warehouseId,
          quantity: qty,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          toast.error(data.error ?? "Not enough stock available");
          void loadProducts();
          return;
        }
        throw new Error(data.error ?? "Failed to create reservation");
      }

      toast.success("Reservation created");
      router.push(`/reservation/${data.reservation.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create reservation",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading inventory...</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Card key={product.id} className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <CardDescription className="font-mono text-xs">
                    {product.sku}
                  </CardDescription>
                </div>
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {product.inventories.map((inv) => (
                <div
                  key={inv.warehouseId}
                  className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <Warehouse className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{inv.warehouseName}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {inv.availableStock} available · {inv.reservedQuantity}{" "}
                      reserved · {inv.totalQuantity} total
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Badge
                      variant={
                        inv.availableStock === 0
                          ? "destructive"
                          : inv.availableStock <= 3
                            ? "warning"
                            : "success"
                      }
                    >
                      {inv.availableStock} left
                    </Badge>
                    <Button
                      size="sm"
                      disabled={inv.availableStock === 0}
                      onClick={() => {
                        setReserveTarget({
                          productId: product.id,
                          productName: product.name,
                          warehouseId: inv.warehouseId,
                          warehouseName: inv.warehouseName,
                          availableStock: inv.availableStock,
                        });
                        setQuantity("1");
                      }}
                    >
                      Reserve
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {reserveTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader>
              <CardTitle>Reserve inventory</CardTitle>
              <CardDescription>
                {reserveTarget.productName} · {reserveTarget.warehouseName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  max={reserveTarget.availableStock}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Up to {reserveTarget.availableStock} units available
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => void handleReserve()}
                  disabled={submitting}
                >
                  {submitting ? "Reserving..." : "Confirm reserve"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setReserveTarget(null)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
