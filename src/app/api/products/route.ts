import { errorResponse, jsonResponse } from "@/lib/api";
import { getProducts } from "@/lib/products";

export async function GET() {
  try {
    const products = await getProducts();
    return jsonResponse(products);
  } catch (error) {
    return errorResponse(error);
  }
}
