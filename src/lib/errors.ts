export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const INSUFFICIENT_STOCK = "Insufficient stock available";
export const RESERVATION_EXPIRED = "Reservation has expired";
export const RESERVATION_NOT_FOUND = "Reservation not found";
export const INVENTORY_NOT_FOUND = "Inventory not found for this product and warehouse";
export const INVALID_RESERVATION_STATE = "Reservation is not in a valid state for this action";
