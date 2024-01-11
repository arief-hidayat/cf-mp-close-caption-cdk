#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import {CfMediaPackageStack, CloudFrontMediaPackageProps} from "../lib/cf-mediapackage-stack";

const app = new cdk.App();

const US_EAST_1: cdk.Environment = { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-1' }

const MP_ORIGIN_PROPS = {
    protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
    originSslProtocols: [cloudfront.OriginSslPolicy.TLS_V1_2],
    httpsPort: 443,
    originShieldEnabled: false,
    readTimeout: cdk.Duration.seconds(30),
    keepaliveTimeout: cdk.Duration.seconds(5),
    connectionTimeout: cdk.Duration.seconds(10),
    connectionAttempts: 3
}

const VOD_MEDIA_PACKAGE_SOLUTION_2: CloudFrontMediaPackageProps  = {
    httpOrigin: {
        // aws cloudfront get-distribution --id $DIST_ID --output json | jq -r '.Distribution.DistributionConfig.Origins.Items[0].DomainName'
        domainName: 'xxx.egress.mediapackage-vod.ap-southeast-1.amazonaws.com',
        originProps: MP_ORIGIN_PROPS
    },
    addCorsResponse: true,
}

new CfMediaPackageStack(app, 'CfMediaPackageStack', {
    env: US_EAST_1,
    ...VOD_MEDIA_PACKAGE_SOLUTION_2
});
