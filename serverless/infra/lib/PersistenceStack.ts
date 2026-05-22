import { Stack, StackProps, RemovalPolicy } from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

/**
 * PersistenceStack — Define la tabla DynamoDB MercadoGlobal.
 *
 * Single-Table Design con GSI para filtrar pedidos por usuario y estado.
 * Se despliega en Floci usando `cdklocal deploy`.
 */
export class PersistenceStack extends Stack {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.table = new dynamodb.Table(this, "MercadoGlobalTable", {
      tableName: "MercadoGlobal",
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "GSI1-UserStatus-Date",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
  }
}
