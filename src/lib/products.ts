import { prisma } from "@/lib/prisma";

export type ProductInventoryView = {
  warehouseId: string;
  warehouseName: string;
  totalQuantity: number;
  reservedQuantity: number;
  availableStock: number;
};

export type ProductView = {
  id: string;
  name: string;
  sku: string;
  inventories: ProductInventoryView[];
};

export async function getProducts(): Promise<ProductView[]> {
  const products = await prisma.product.findMany({
    include: {
      inventories: {
        include: { warehouse: true },
        orderBy: { warehouse: { name: "asc" } },
      },
    },
    orderBy: { name: "asc" },
  });

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    inventories: product.inventories.map((inv) => ({
      warehouseId: inv.warehouseId,
      warehouseName: inv.warehouse.name,
      totalQuantity: inv.totalQuantity,
      reservedQuantity: inv.reservedQuantity,
      availableStock: inv.totalQuantity - inv.reservedQuantity,
    })),
  }));
}
