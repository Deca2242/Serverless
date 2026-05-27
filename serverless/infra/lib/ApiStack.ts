import { Stack, StackProps, CfnOutput } from "aws-cdk-lib";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { HttpMethod, CorsHttpMethod } from "aws-cdk-lib/aws-apigatewayv2";

interface ApiStackProps extends StackProps {
  usersFunction: NodejsFunction;
  catalogFunction: NodejsFunction;
  cartFunction: NodejsFunction;
}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { usersFunction, catalogFunction, cartFunction } = props;

    const api = new apigwv2.HttpApi(this, "MercadoGlobalApi", {
      apiName: "MercadoGlobal",
      description: "MercadoGlobal Serverless API",
      corsPreflight: {
        allowOrigins: ["*"],
        allowMethods: [
          CorsHttpMethod.GET,
          CorsHttpMethod.POST,
          CorsHttpMethod.PATCH,
          CorsHttpMethod.DELETE,
          CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ["Content-Type", "Authorization"],
      },
    });

    // Integracion entre gateway y lambdas
    const usersIntegration = new HttpLambdaIntegration("UsersIntegration", usersFunction);
    const catalogIntegration = new HttpLambdaIntegration("CatalogIntegration", catalogFunction);
    const cartIntegration = new HttpLambdaIntegration("CartIntegration", cartFunction);

    // ── User routes ────────────────────────────────────────────────────────
    api.addRoutes({ path: "/users", methods: [HttpMethod.POST], integration: usersIntegration });
    api.addRoutes({
      path: "/users/{userId}/dashboard",
      methods: [HttpMethod.GET],
      integration: usersIntegration,
    });

    // ── Catalog routes ─────────────────────────────────────────────────────
    api.addRoutes({
      path: "/categories",
      methods: [HttpMethod.GET, HttpMethod.POST],
      integration: catalogIntegration,
    });
    api.addRoutes({
      path: "/categories/{slug}/products",
      methods: [HttpMethod.GET],
      integration: catalogIntegration,
    });
    api.addRoutes({
      path: "/products",
      methods: [HttpMethod.GET, HttpMethod.POST],
      integration: catalogIntegration,
    });
    api.addRoutes({
      path: "/products/{slug}/stock",
      methods: [HttpMethod.PATCH],
      integration: catalogIntegration,
    });

    // ── Cart routes ────────────────────────────────────────────────────────
    api.addRoutes({
      path: "/cart/{userId}",
      methods: [HttpMethod.GET],
      integration: cartIntegration,
    });
    api.addRoutes({
      path: "/cart/{userId}/items",
      methods: [HttpMethod.POST],
      integration: cartIntegration,
    });
    api.addRoutes({
      path: "/cart/{userId}/items/{slug}",
      methods: [HttpMethod.DELETE],
      integration: cartIntegration,
    });

    new CfnOutput(this, "ApiUrl", {
      value: api.url ?? "URL not available",
      description: "API Gateway HTTP API URL",
      exportName: "MercadoGlobalApiUrl",
    });
  }
}
