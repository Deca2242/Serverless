import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

import { extractPathParams } from "../shared/dynamodb";
import { buildErrorResponse } from "../shared/errors";
import { CREATED, NO_CONTENT, OK, okCached } from "../shared/http/responses";
import { UserRepository } from "./repositories/user.repository";
import { UserService } from "./services/user.service";

const userRepository = new UserRepository();
const userService = new UserService(userRepository);

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  const { routeKey, pathParameters, body, queryStringParameters, rawPath } = event;
  const p = extractPathParams(routeKey, rawPath, pathParameters);

  try {
    switch (routeKey) {
      case "POST /users":
        return CREATED(await userService.createProfile(body));

      case "GET /users/{userId}/profile":
        return OK(await userService.getProfile(p.userId!));

      case "GET /users/{userId}/dashboard": {
        const result = await userService.getDashboard(p.userId!);
        return okCached(result.value, result.cacheStatus);
      }

      case "GET /users/{userId}/addresses":
        return OK(await userService.listAddresses(p.userId!));

      case "POST /users/{userId}/addresses":
        return CREATED(await userService.addAddress(p.userId!, body));

      case "DELETE /users/{userId}/addresses/{addressId}":
        await userService.deleteAddress(p.userId!, p.addressId!);
        return NO_CONTENT();

      case "GET /users/{userId}/payments":
        return OK(await userService.listPayments(p.userId!));

      case "POST /users/{userId}/payments":
        return CREATED(await userService.addPayment(p.userId!, body));

      case "DELETE /users/{userId}/payments/{paymentId}":
        await userService.deletePayment(p.userId!, p.paymentId!);
        return NO_CONTENT();

      case "GET /users/{userId}/orders":
        return OK(await userService.listOrders(p.userId!, queryStringParameters ?? {}));

      default:
        return { statusCode: 404, body: JSON.stringify({ error: "Route not found" }) };
    }
  } catch (err) {
    return buildErrorResponse(err);
  }
};
