import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

import { CatalogRepository } from "../catalog/repositories/catalog.repository";
import { extractPathParams } from "../shared/dynamodb";
import { buildErrorResponse } from "../shared/errors";
import { NO_CONTENT, OK } from "../shared/http/responses";
import { CartRepository } from "./repositories/cart.repository";
import { CartService } from "./services/cart.service";

const cartRepository = new CartRepository();
const catalogRepository = new CatalogRepository();
const cartService = new CartService(cartRepository, catalogRepository);

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

      case "DELETE /cart/{userId}/items/{slug}":
        await cartService.removeItem(p.userId!, p.slug!);
        return NO_CONTENT();

      default:
        return { statusCode: 404, body: JSON.stringify({ error: "Route not found" }) };
    }
  } catch (err) {
    return buildErrorResponse(err);
  }
};
