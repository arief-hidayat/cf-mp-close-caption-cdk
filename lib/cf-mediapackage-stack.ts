import * as cdk from 'aws-cdk-lib';
import {CfnOutput, Duration} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as cf from 'aws-cdk-lib/aws-cloudfront';
import * as fs from "fs";
import * as iam from 'aws-cdk-lib/aws-iam';
import {HttpOriginProps} from "aws-cdk-lib/aws-cloudfront-origins";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as lambda from "aws-cdk-lib/aws-lambda";
interface HttpOriginInfo {
    domainName: string,
    originProps?: HttpOriginProps,
}
export interface CloudFrontMediaPackageProps extends cdk.StackProps {
    // default using managed cache policy for MediaPackage
    manifestCachePolicyProps?: cf.CachePolicyProps
    httpOrigin: HttpOriginInfo
    addCorsResponse: boolean
}
export class CfMediaPackageStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: CloudFrontMediaPackageProps) {
        super(scope, id, props);
        const leRole = this.createLambdaEdgeBasicExecutionRole();
        const origin = this.createOrigin(props);
        const cfBehaviours: Record<string, cf.BehaviorOptions> = {}

        const liveManifestCachePolicy = props.manifestCachePolicyProps ? this.createLiveManifestCachePolicy(props.manifestCachePolicyProps) : cf.CachePolicy.ELEMENTAL_MEDIA_PACKAGE;
        const updateHlsManifestWithCloseCaptionFunc = this.createFuncUpdateHlsManifestWithCloseCaption(leRole, props)
        cfBehaviours["/out/v1/index.m3u8"] = {
            origin: origin,
            viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            allowedMethods: cf.AllowedMethods.ALLOW_GET_HEAD,
            cachedMethods: cf.CachedMethods.CACHE_GET_HEAD,
            cachePolicy: liveManifestCachePolicy,
            originRequestPolicy: cf.OriginRequestPolicy.ALL_VIEWER,
            responseHeadersPolicy: cf.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT,
            edgeLambdas: [{eventType: cf.LambdaEdgeEventType.ORIGIN_REQUEST, includeBody: false, functionVersion: updateHlsManifestWithCloseCaptionFunc.currentVersion}],
            compress: true
        }
        const cfMediaPackageDist = new cf.Distribution(this, 'cfMediaPackageDist', {
            defaultBehavior: {
                origin: origin,
                viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowedMethods: cf.AllowedMethods.ALLOW_GET_HEAD,
                cachedMethods: cf.CachedMethods.CACHE_GET_HEAD,
                cachePolicy: liveManifestCachePolicy,
                responseHeadersPolicy: cf.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT,
                compress: true
            },
            defaultRootObject: "",
            httpVersion: cf.HttpVersion.HTTP1_1,
            additionalBehaviors: cfBehaviours,
        });

        new CfnOutput(this, 'cfMpCloudFrontDomainName', {value: cfMediaPackageDist.domainName});
        new CfnOutput(this, 'cfMpCloudFrontDistributionId', {value: cfMediaPackageDist.distributionId});
    }

    createLambdaEdgeBasicExecutionRole() {
        return new iam.Role(this, 'lambdaEdgeBasicExecutionRole', {
            assumedBy: new iam.CompositePrincipal(new iam.ServicePrincipal('edgelambda.amazonaws.com'), new iam.ServicePrincipal('lambda.amazonaws.com')) ,
            managedPolicies: [iam.ManagedPolicy.fromManagedPolicyArn(this, 'AWSLambdaBasicExecutionRole', 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole')],
        });
    }
    createOrigin(mediaCf: CloudFrontMediaPackageProps): cf.IOrigin {
        return new origins.HttpOrigin(mediaCf.httpOrigin.domainName, mediaCf.httpOrigin.originProps)
    }
    createLiveManifestCachePolicy(cachePolicy: cf.CachePolicyProps): cf.CachePolicy {
        return new cf.CachePolicy(this, 'liveManifestCachePolicy', cachePolicy)
    }

    createFuncUpdateHlsManifestWithCloseCaption(leRole: iam.Role, props: CloudFrontMediaPackageProps) {
        return this.createLambdaFromFile(leRole, 'updateHlsManifestWithCloseCaptionFunc',
            fs.readFileSync('./lib/functions/updateHlsManifestWithCloseCaption.js', 'utf-8')
                .replace(/MANIFEST_DOMAIN_NAME/g, props.httpOrigin.domainName)
                .replace(/CORS_RESPONSE/g, props.addCorsResponse ? '*' : '')
        );
    }
    createLambdaFromFile(lambdaEdgeBasicExecutionRole: iam.Role, name: string, inlineCode: string, timeout: Duration = Duration.seconds(15)): lambda.Function {
        const code = lambda.Code.fromInline(inlineCode)
        return new lambda.Function(this, name, {
            runtime: lambda.Runtime.NODEJS_16_X,
            handler: 'index.handler',
            role: lambdaEdgeBasicExecutionRole,
            code: code,
            timeout: timeout,
        });
    }
}
