import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

import { extractPathParams } from "../shared/dynamodb";
import { buildErrorResponse } from "../shared/errors";
import { CREATED, okCached } from "../shared/http/responses";
import { UserRepository } from "./repositories/user.repository";
import { UserService } from "./services/user.service";

const userRepository = new UserRepository();
const userService = new UserService(userRepository);

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  const { routeKey, pathParameters, body, rawPath } = event;
  const p = extractPathParams(routeKey, rawPath, pathParameters);

  try {
    switch (routeKey) {
      case "POST /users":
        return CREATED(await userService.createProfile(body));

      case "GET /users/{userId}/dashboard": {
        const result = await userService.getDashboard(p.userId!);
        return okCached(result.value, result.cacheStatus);
      }

      default:
        return { statusCode: 404, body: JSON.stringify({ error: "Route not found" }) };
    }
  } catch (err) {
    return buildErrorResponse(err);
  }
};
