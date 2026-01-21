import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, "Vpc", { isDefault: true });

    const cluster = new ecs.Cluster(this, "MyCluster", { vpc });

    const fargateService =
      new ecs_patterns.ApplicationLoadBalancedFargateService(
        this,
        "MyFargateService",
        {
          cluster: cluster,
          taskImageOptions: {
            image: ecs.ContainerImage.fromAsset("../app"),
          },
          publicLoadBalancer: true,
        },
      );

    const myLambda = new lambda.Function(this, "MyLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("lambda"),
    });

    const api = new apigateway.RestApi(this, "MyApi", {
      restApiName: "My API Service",
    });

    const lambdaIntegration = new apigateway.LambdaIntegration(myLambda);
    const lambdaResource = api.root.addResource("lambda");
    lambdaResource.addMethod("GET", lambdaIntegration);

    const vpcLink = new apigateway.VpcLink(this, "VpcLink", {
      targets: [fargateService.loadBalancer],
    });

    const httpIntegration = new apigateway.Integration({
      type: apigateway.IntegrationType.HTTP_PROXY,
      integrationHttpMethod: "ANY",
      options: {
        connectionType: apigateway.ConnectionType.VPC_LINK,
        vpcLink: vpcLink,
      },
      uri: `http://${fargateService.loadBalancer.loadBalancerDnsName}/{proxy}`,
    });

    const apiResource = api.root.addResource("api");
    const proxyResource = apiResource.addProxy({
      defaultIntegration: httpIntegration,
      anyMethod: true,
    });

    new cdk.CfnOutput(this, "LoadBalancerDns", {
      value: fargateService.loadBalancer.loadBalancerDnsName,
    });
    new cdk.CfnOutput(this, "ApiGatewayUrl", { value: api.url });
  }
}
