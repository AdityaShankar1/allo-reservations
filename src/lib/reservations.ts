import { Prisma, Reservation, ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ApiError,
  INSUFFICIENT_STOCK,
  INVENTORY_NOT_FOUND,
  INVALID_RESERVATION_STATE,
  RESERVATION_EXPIRED,
  RESERVATION_NOT_FOUND,
} from "@/lib/errors";
import type { CreateReservationInput } from "@/lib/validations";

const RESERVATION_TTL_MS = 10 * 60 * 1000;

type LockedInventoryRow = {
  id: string;
  totalQuantity: number;
  reservedQuantity: number;
};

export function getRemainingSeconds(expiresAt: Date): number {
  return Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
}

export function isExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() <= Date.now();
}

async function releaseReservationInTx(
  tx: Prisma.TransactionClient,
  reservation: Reservation,
) {
  if (reservation.status !== ReservationStatus.PENDING) {
    return reservation;
  }

  await tx.$executeRaw`
    UPDATE "Inventory"
    SET "reservedQuantity" = "reservedQuantity" - ${reservation.quantity}
    WHERE "productId" = ${reservation.productId}
      AND "warehouseId" = ${reservation.warehouseId}
  `;

  return tx.reservation.update({
    where: { id: reservation.id },
    data: {
      status: ReservationStatus.RELEASED,
      releasedAt: new Date(),
    },
  });
}

export async function releaseExpiredReservationIfNeeded(
  reservation: Reservation,
): Promise<Reservation> {
  if (
    reservation.status !== ReservationStatus.PENDING ||
    !isExpired(reservation.expiresAt)
  ) {
    return reservation;
  }

  return prisma.$transaction((tx) => releaseReservationInTx(tx, reservation));
}

export async function createReservation(input: CreateReservationInput) {
  const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS);

  try {
    const reservation = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<LockedInventoryRow[]>`
        SELECT id, "totalQuantity", "reservedQuantity"
        FROM "Inventory"
        WHERE "productId" = ${input.productId}
          AND "warehouseId" = ${input.warehouseId}
        FOR UPDATE
      `;

      const inventory = rows[0];
      if (!inventory) {
        throw new ApiError(404, INVENTORY_NOT_FOUND);
      }

      const availableStock =
        inventory.totalQuantity - inventory.reservedQuantity;

      if (availableStock < input.quantity) {
        throw new ApiError(409, INSUFFICIENT_STOCK);
      }

      await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          reservedQuantity: { increment: input.quantity },
        },
      });

      return tx.reservation.create({
        data: {
          productId: input.productId,
          warehouseId: input.warehouseId,
          quantity: input.quantity,
          expiresAt,
        },
      });
    });

    return { reservation };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw error;
  }
}

export async function confirmReservation(id: string) {
  const existing = await prisma.reservation.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, RESERVATION_NOT_FOUND);
  }

  if (existing.status === ReservationStatus.CONFIRMED) {
    throw new ApiError(400, INVALID_RESERVATION_STATE);
  }

  if (existing.status === ReservationStatus.RELEASED) {
    throw new ApiError(400, INVALID_RESERVATION_STATE);
  }

  if (isExpired(existing.expiresAt)) {
    await prisma.$transaction((tx) => releaseReservationInTx(tx, existing));
    throw new ApiError(410, RESERVATION_EXPIRED);
  }

  const reservation = await prisma.$transaction(async (tx) => {
    const current = await tx.reservation.findUnique({ where: { id } });
    if (!current || current.status !== ReservationStatus.PENDING) {
      throw new ApiError(400, INVALID_RESERVATION_STATE);
    }

    if (isExpired(current.expiresAt)) {
      await releaseReservationInTx(tx, current);
      throw new ApiError(410, RESERVATION_EXPIRED);
    }

    await tx.inventory.update({
      where: {
        productId_warehouseId: {
          productId: current.productId,
          warehouseId: current.warehouseId,
        },
      },
      data: {
        totalQuantity: { decrement: current.quantity },
        reservedQuantity: { decrement: current.quantity },
      },
    });

    return tx.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
    });
  });

  return { reservation };
}

export async function releaseReservation(id: string) {
  const existing = await prisma.reservation.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, RESERVATION_NOT_FOUND);
  }

  if (existing.status === ReservationStatus.RELEASED) {
    return { reservation: existing };
  }

  if (existing.status === ReservationStatus.CONFIRMED) {
    throw new ApiError(400, INVALID_RESERVATION_STATE);
  }

  const reservation = await prisma.$transaction((tx) =>
    releaseReservationInTx(tx, existing),
  );

  return { reservation };
}

export async function getReservationDetails(id: string) {
  const found = await prisma.reservation.findUnique({
    where: { id },
    include: {
      product: true,
      warehouse: true,
    },
  });

  if (!found) {
    throw new ApiError(404, RESERVATION_NOT_FOUND);
  }

  await releaseExpiredReservationIfNeeded(found);

  const refreshed = await prisma.reservation.findUnique({
    where: { id },
    include: {
      product: true,
      warehouse: true,
    },
  });

  if (!refreshed) {
    throw new ApiError(404, RESERVATION_NOT_FOUND);
  }

  const { product, warehouse, ...reservationData } = refreshed;

  return {
    reservation: reservationData,
    product: {
      id: product.id,
      name: product.name,
      sku: product.sku,
    },
    warehouse: {
      id: warehouse.id,
      name: warehouse.name,
    },
    remainingSeconds: getRemainingSeconds(refreshed.expiresAt),
    expired: isExpired(refreshed.expiresAt),
  };
}
