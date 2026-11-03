/**************************************************************************
 *  Copyright 2019 ModusBox, Inc.                                             *
 *                                                                            *
 *  info@modusbox.com                                                         *
 *                                                                            *
 *  Licensed under the Apache License, Version 2.0 (the "License");           *
 *  you may not use this file except in compliance with the License.          *
 *  You may obtain a copy of the License at                                   *
 *  http://www.apache.org/licenses/LICENSE-2.0                                *
 *                                                                            *
 *  Unless required by applicable law or agreed to in writing, software       *
 *  distributed under the License is distributed on an "AS IS" BASIS,         *
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  *
 *  See the License for the specific language governing permissions and       *
 *  limitations under the License.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Sridevi Miriyala - sridevi.miriyala@modusbox.com                **
 * 
 *  CONTRIBUTORS:                                                      *
 *       Miguel de Barros - miguel.debarros@modusbox.com                **
 * 
 **************************************************************************/

export type HeaderType = { [key:string]:string; };

/** What a caller adds to every request; a test caller's `request` is one. */
export type ApiHelperOptions = {
  headers?: HeaderType
}

export enum MethodEnum {
  POST = 'POST',
  GET = 'GET',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

export type RequestConfig = {
  method: MethodEnum | string,
  url: string,
  body?: string,
  headers?: HeaderType
}

export class ApiHelper {
  private _options: ApiHelperOptions

  constructor (options: ApiHelperOptions) {
    this._options = { ...options };
  }

  async getResponseBody (config: RequestConfig) {
    const response = await this.sendRequest(config);

    return response?.data;
  }

  async getResponseStatus (config: RequestConfig) {
    const response = await this.sendRequest(config);

    return response?.status;
  }

  async getResponseHeaders (config: RequestConfig) {
    const response = await this.sendRequest(config);

    return response?.headers;
  }

  async sendRequest (config: RequestConfig) {
    const headers = { ...this._options.headers, ...processHeaders(config?.headers) };

    const response = await fetch(config.url, {
      method: config.method,
      headers: headers,
      body: config?.body,
      redirect: 'manual'
    });

    let data: any;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      status: response.status,
      data: data,
      headers: Object.fromEntries(response.headers.entries())
    };
  }
};

export default ApiHelper;

const processHeaders = (rawHeaders: HeaderType | undefined): HeaderType => {
  let headers: { [key:string]:string; } = {};

  if (rawHeaders == null) {
    return headers;
  }

  if (rawHeaders instanceof Map) {
    rawHeaders.forEach((value, key) => {
      headers[key] = value;
    });
  } else {
    headers = rawHeaders;
  }

  return headers;
};
