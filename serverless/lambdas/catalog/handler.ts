import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

import { extractPathParams } from "../shared/dynamodb";
import { buildErrorResponse } from "../shared/errors";
import { CREATED, OK, okCached } from "../shared/http/responses";
import { CatalogRepository } from "./repositories/catalog.repository";
import { CatalogService } from "./services/catalog.service";

const catalogRepository = new CatalogRepository();
const catalogService = new CatalogService(catalogRepository);

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  const { routeKey, pathParameters, body, queryStringParameters, rawPath } = event;


  const p = extractPathParams(routeKey, rawPath, pathParameters);

  try {
    switch (routeKey) {
      case "GET /categories": {
        const result = await catalogService.listCategories();
        return okCached(result.value, result.cacheStatus);
      }

      case "POST /categories":
        return CREATED(await catalogService.createCategory(body));

      case "GET /categories/{slug}/products": {
        const result = await catalogService.listProductsByCategory(p.slug!);
        return okCached(result.value, result.cacheStatus);
      }

      case "GET /products":
        if (queryStringParameters?.q?.trim()) {
          const result = await catalogService.search(queryStringParameters.q);
          return okCached(result.value, result.cacheStatus);
        }

        {
          const result = await catalogService.listAllProducts();
          return okCached(result.value, result.cacheStatus);
        }

      case "GET /products/{slug}":
        return OK(await catalogService.getProduct(p.slug!));

      case "GET /products/{slug}/stock":
        return OK(await catalogService.getStock(p.slug!));

      case "POST /products":
        return CREATED(await catalogService.createProduct(body));

      case "PATCH /products/{slug}/stock":
        return OK(await catalogService.updateStock(p.slug!, body));

      default:
        return { statusCode: 404, body: JSON.stringify({ error: "Route not found" }) };
    }
  } catch (err) {
    return buildErrorResponse(err);
  }
};
