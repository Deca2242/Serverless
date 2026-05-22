#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { PersistenceStack } from "../lib/PersistenceStack";
import { CoreStack } from "../lib/CoreStack";
import { ApiStack } from "../lib/ApiStack";

const app = new App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT ?? "000000000000",
  region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
};

const persistenceStack = new PersistenceStack(app, "MercadoGlobal-Persistence", { env });

const coreStack = new CoreStack(app, "MercadoGlobal-Core", {
  env,
  table: persistenceStack.table,
});

coreStack.addDependency(persistenceStack);

const apiStack = new ApiStack(app, "MercadoGlobal-Api", {
  env,
  usersFunction: coreStack.usersFunction,
  ordersFunction: coreStack.ordersFunction,
  catalogFunction: coreStack.catalogFunction,
  cartFunction: coreStack.cartFunction,
});

apiStack.addDependency(coreStack);

app.synth();
