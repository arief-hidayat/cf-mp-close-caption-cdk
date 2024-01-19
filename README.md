# Context

This is Infrastructure as Code (AWS CDK) to setup CloudFront distribution with origin

## CDK - One time Setup

### [Install AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/cli.html)
    
* install nodeJS
* install npm
* `npm install -g aws-cdk`

### Clone repo
```bash
git clone https://github.com/arief-hidayat/cf-mp-close-caption-cdk.git
cd cf-mp-close-caption-cdk
```

### Deploy

Review [cf-mp-close-caption-cdk.ts](./bin/cf-mp-close-caption-cdk.ts), especially `domainName` in `CloudFrontMediaPackageProps`

Run
```bash
cdk deploy
```

You will get output like this
```text
Outputs:
CfMediaPackageStack.cfMpCloudFrontDistributionId = EXXXX
CfMediaPackageStack.cfMpCloudFrontDomainName = dxxx.cloudfront.net
```

Try playing your media using above cloudfront domain name

### Manual Setup on Your Existing CloudFront Distribution

