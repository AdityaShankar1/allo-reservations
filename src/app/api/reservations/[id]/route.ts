import { errorResponse, jsonResponse } from "@/lib/api";
import { getReservationDetails } from "@/lib/reservations";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const details = await getReservationDetails(id);
    return jsonResponse(details);
  } catch (error) {
    return errorResponse(error);
  }
}
