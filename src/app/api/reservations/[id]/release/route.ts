import { errorResponse, jsonResponse } from "@/lib/api";
import { releaseReservation } from "@/lib/reservations";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await releaseReservation(id);
    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
