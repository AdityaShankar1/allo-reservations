import { errorResponse, jsonResponse } from "@/lib/api";
import { createReservation } from "@/lib/reservations";
import { createReservationSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = createReservationSchema.parse(body);
    const result = await createReservation(input);
    return jsonResponse(result, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
