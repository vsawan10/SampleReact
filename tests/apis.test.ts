import axios, {AxiosRequestConfig, AxiosResponse, Method} from 'axios';
import * as https from 'https';

https.globalAgent.options.rejectUnauthorized = false;

type ApiTestOperation = {
    apiId: string;
    name: string;
    method: string;
    endpoint: string;
    path: string;
    type: string;
    data: any;
    headers: any;
    parameters: any;
    statusCode: number;
    jestMaxRuntime: number;
    jestMatchOperation: string;
    jestMatchName: string;
    jestMatchValue: string;
}

function findValue(response: AxiosResponse, path) {
    if (!path) {
        path = 'data';
    }
    const paths = path.split('.');
    let finalValue = response;

    for (let i = 1; i < paths.length; i++) {
        if (!finalValue[paths[i]]) return undefined;
        finalValue = finalValue[paths[i]];
    }
    return finalValue;
}

const servers = (process.env.P9_SERVER_URL && process.env.P9_SERVER_TOKEN)
    ? [{url: process.env.P9_SERVER_URL, token: process.env.P9_SERVER_TOKEN}]
    : JSON.parse(`[]`);

const apiOperationsToTest: ApiTestOperation[] = JSON.parse('[{"apiId":"69881b65-4c55-48ba-9a67-5b793a872513","endpoint":"/api/serverscript/gshr_oss_rule_engine","method":"POST","path":"/OSS_FETCH_PGAREAS","type":"script"}]');

for (let server of servers) {
    for (let operationToTest of apiOperationsToTest) {
        describe(operationToTest.name, () => {
            test(`${operationToTest.method} ${operationToTest.path}`, async () => {
                const runtimeStart = new Date().getTime();

                const parameterKeys = Object.keys(operationToTest.parameters);
                const parameters = parameterKeys.length > 0
                    ? `?${parameterKeys.map(key => `${key}=${operationToTest.parameters[key]}`).join('&')}`
                    : undefined
                const endpoint = `${operationToTest.type ? server.url : ''}${operationToTest.endpoint}${operationToTest.path}${parameters ? parameters : ''}`;
                const url = !operationToTest.type ? `${server.url}/proxy/${encodeURIComponent(endpoint)}/${operationToTest.apiId}` : endpoint;

                const opts: AxiosRequestConfig = {
                    method: operationToTest.method as Method,
                    url,
                    ...(operationToTest.data && {data: operationToTest.data}),
                    headers: {
                        "Authorization": `Bearer ${server.token}`,
                        ...operationToTest.headers
                    },
                    ...(operationToTest.data && {data: operationToTest.data})
                };

                const response = await axios(opts);

                const runtimeEnd = new Date().getTime();
                const runtime = runtimeEnd - runtimeStart;
                if (operationToTest.statusCode) {
                    expect(response.status).toBe(+operationToTest.statusCode);
                }

                if (operationToTest.jestMaxRuntime) {
                    expect(runtime).toBeLessThan(operationToTest.jestMaxRuntime);
                }

                if (operationToTest.jestMatchName && operationToTest.jestMatchValue) {
                    expect(findValue(response, operationToTest.jestMatchName))[operationToTest.jestMatchOperation](operationToTest.jestMatchValue);
                }
            });
        });
    }
}
