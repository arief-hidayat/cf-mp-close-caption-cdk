'use strict';
const https = require('https');
const path = require('path');

exports.handler = (event, context, callback) => {
    const request = event.Records[0].cf.request;
    const uri = request.uri;
    const manifestDomainUrl = 'https://MANIFEST_DOMAIN_NAME';
    let response = {};
    let querystring = (request.querystring)?"?"+request.querystring:"";
    //request to MediaPackage to get manifest m3u8
    https.get(manifestDomainUrl+request.uri+querystring, (resp) => {
        //use same status code
        response.status = resp.statusCode;
        //respond with a few headers
        let headers = {
            "content-type": [{"key": "Content-Type", "value": resp.headers["content-type"]||"text/html"}],
            "server": [{"key": "Server", "value": resp.headers["server"]||"Server"}]
        };
        const corsResponse = 'CORS_RESPONSE'
        if(corsResponse.length > 0) {
            headers['access-control-allow-origin'] = [{"key": "Access-Control-Allow-Origin", "value": corsResponse}]
        }
        response.headers = headers;
        //load response to <data>
        let data = "";
        resp.on('data', (chunk) => {
            data += chunk;
        });
        let body = [];
        resp.on('end', () => {
            data.split("\n").forEach((elem)=> {
                if (elem.startsWith("#EXT-X-STREAM-INF") && elem.indexOf("CLOSED-CAPTIONS=") === -1) {
                    body.push(elem + ",CLOSED-CAPTIONS=NONE");
                } else {
                    body.push(elem);
                }
            });
            response.body = body.join('\n');
            callback(null, response);
        });
    }).on('error', (err)=>{
        callback(
            null,
            {
                'status': '500',
                'statusDescription': 'Server Error',
                'headers': {
                    'content-type': [{'key': 'Content-Type', 'value': 'text/plain'}]
                },
                'body': 'Error reading content \n\n'+err
            }
        );
    });
};
