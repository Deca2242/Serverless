import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

import { extractPathParams } from "../shared/dynamodb";
import { buildErrorResponse } from "../shared/errors";
import { CREATED, OK } from "../shared/http/responses";
import { OrderRepository } from "./repositories/order.repository";
import { OrderService } from "./services/order.service";

const orderRepository = new OrderRepository();
const orderService = new OrderService(orderRepository);

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  const { routeKey, pathParameters, body, rawPath } = event;
  const p = extractPathParams(routeKey, rawPath, pathParameters);

  try {
    switch (routeKey) {
      case "POST /orders":
        return CREATED(await orderService.createOrder(body));

      case "GET /orders/{orderId}":
        return OK(await orderService.getHeader(p.orderId!));

      case "GET /orders/{orderId}/items":
        return OK(await orderService.listItems(p.orderId!));

      case "GET /orders/{orderId}/detail":
        return OK(await orderService.getFullDetail(p.orderId!));

      case "PATCH /orders/{orderId}/status":
        return OK(await orderService.updateStatus(p.orderId!, body));

      default:
        return { statusCode: 404, body: JSON.stringify({ error: "Route not found" }) };
    }
  } catch (err) {
    return buildErrorResponse(err);
  }
};
