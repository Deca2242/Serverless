import { Stack, StackProps, Duration } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import * as path from "path";

interface CoreStackProps extends StackProps {
  table: dynamodb.Table;
}

/**
 * CoreStack — Define las funciones Lambda para users, orders, catalog y cart.
 */
export class CoreStack extends Stack {
  public readonly usersFunction: NodejsFunction;
  public readonly ordersFunction: NodejsFunction;
  public readonly catalogFunction: NodejsFunction;
  public readonly cartFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: CoreStackProps) {
    super(scope, id, props);

    const { table } = props;

    const commonEnv = {
      TABLE_NAME: table.tableName,
      DYNAMO_ENDPOINT: process.env.AWS_ENDPOINT_URL ?? "http://floci:4566",
      NODE_OPTIONS: "--enable-source-maps",
      REDIS_URL: process.env.REDIS_URL ?? "redis://redis:6379",
      REDIS_KEY_PREFIX: process.env.REDIS_KEY_PREFIX ?? "mg",
      CACHE_ENABLED: process.env.CACHE_ENABLED ?? "true",
      CACHE_TTL_SECONDS: process.env.CACHE_TTL_SECONDS ?? "300",
      CACHE_DEBUG: process.env.CACHE_DEBUG ?? "false",
    };

    const commonBundling = {
      externalModules: [],
      minify: false,
      sourceMap: true,
      target: "es2022",
    };

    const lambdaDefaults = {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      bundling: commonBundling,
      environment: commonEnv,
      timeout: Duration.seconds(30),
      memorySize: 256,
    };

    this.usersFunction = new NodejsFunction(this, "UsersFunction", {
      ...lambdaDefaults,
      functionName: "mercadoglobal-users",
      entry: path.join(__dirname, "../../lambdas/users/handler.ts"),
      description: "Handles all /users/... endpoints",
    });

    this.ordersFunction = new NodejsFunction(this, "OrdersFunction", {
      ...lambdaDefaults,
      functionName: "mercadoglobal-orders",
      entry: path.join(__dirname, "../../lambdas/orders/handler.ts"),
      description: "Handles all /orders/... endpoints",
    });

    this.catalogFunction = new NodejsFunction(this, "CatalogFunction", {
      ...lambdaDefaults,
      functionName: "mercadoglobal-catalog",
      entry: path.join(__dirname, "../../lambdas/catalog/handler.ts"),
      description: "Handles catalog /categories and /products endpoints",
    });

    this.cartFunction = new NodejsFunction(this, "CartFunction", {
      ...lambdaDefaults,
      functionName: "mercadoglobal-cart",
      entry: path.join(__dirname, "../../lambdas/cart/handler.ts"),
      description: "Handles cart in Redis + checkout",
    });

    table.grantReadWriteData(this.usersFunction);
    table.grantReadWriteData(this.ordersFunction);
    table.grantReadWriteData(this.catalogFunction);
    table.grantReadWriteData(this.cartFunction);
  }
}
