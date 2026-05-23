import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.reservation.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  const [sf, ny, la] = await Promise.all([
    prisma.warehouse.create({ data: { name: "San Francisco" } }),
    prisma.warehouse.create({ data: { name: "New York" } }),
    prisma.warehouse.create({ data: { name: "Los Angeles" } }),
  ]);

  const [headphones, keyboard, mug] = await Promise.all([
    prisma.product.create({
      data: { name: "Wireless Headphones", sku: "WH-100" },
    }),
    prisma.product.create({
      data: { name: "Mechanical Keyboard", sku: "MK-200" },
    }),
    prisma.product.create({
      data: { name: "Ceramic Mug", sku: "CM-300" },
    }),
  ]);

  const inventoryData = [
    { productId: headphones.id, warehouseId: sf.id, totalQuantity: 12, reservedQuantity: 0 },
    { productId: headphones.id, warehouseId: ny.id, totalQuantity: 5, reservedQuantity: 0 },
    { productId: headphones.id, warehouseId: la.id, totalQuantity: 8, reservedQuantity: 0 },
    { productId: keyboard.id, warehouseId: sf.id, totalQuantity: 20, reservedQuantity: 0 },
    { productId: keyboard.id, warehouseId: ny.id, totalQuantity: 3, reservedQuantity: 0 },
    { productId: keyboard.id, warehouseId: la.id, totalQuantity: 15, reservedQuantity: 0 },
    { productId: mug.id, warehouseId: sf.id, totalQuantity: 50, reservedQuantity: 0 },
    { productId: mug.id, warehouseId: ny.id, totalQuantity: 30, reservedQuantity: 0 },
    { productId: mug.id, warehouseId: la.id, totalQuantity: 1, reservedQuantity: 0 },
  ];

  await prisma.inventory.createMany({ data: inventoryData });

  console.log("Seed complete:", {
    warehouses: 3,
    products: 3,
    inventories: inventoryData.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
