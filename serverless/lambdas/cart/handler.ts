import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

import { CatalogRepository } from "../catalog/repositories/catalog.repository";
import { extractPathParams } from "../shared/dynamodb";
import { buildErrorResponse } from "../shared/errors";
import { CREATED, NO_CONTENT, OK } from "../shared/http/responses";
import { CartRepository } from "./repositories/cart.repository";
import { CheckoutRepository } from "./repositories/checkout.repository";
import { CartService } from "./services/cart.service";

const cartRepository = new CartRepository();
const checkoutRepository = new CheckoutRepository();
const catalogRepository = new CatalogRepository();
const cartService = new CartService(cartRepository, checkoutRepository, catalogRepository);

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  const { routeKey, pathParameters, body, rawPath } = event;
  const p = extractPathParams(routeKey, rawPath, pathParameters);

  try {
    switch (routeKey) {
      case "GET /cart/{userId}":
        return OK(await cartService.getCart(p.userId!));

      case "POST /cart/{userId}/items":
        return OK(await cartService.addItem(p.userId!, body));

      case "PATCH /cart/{userId}/items/{slug}":
        return OK(await cartService.updateItem(p.userId!, p.slug!, body));

      case "DELETE /cart/{userId}/items/{slug}":
        await cartService.removeItem(p.userId!, p.slug!);
        return NO_CONTENT();

      case "DELETE /cart/{userId}":
        await cartService.clearCart(p.userId!);
        return NO_CONTENT();

      case "POST /cart/{userId}/checkout":
        return CREATED(await cartService.checkout(p.userId!, body));

      default:
        return { statusCode: 404, body: JSON.stringify({ error: "Route not found" }) };
    }
  } catch (err) {
    return buildErrorResponse(err);
  }
};
