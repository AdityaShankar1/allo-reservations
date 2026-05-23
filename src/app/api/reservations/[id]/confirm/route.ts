import { errorResponse, jsonResponse } from "@/lib/api";
import { confirmReservation } from "@/lib/reservations";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await confirmReservation(id);
    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
