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

import { CookieJar } from 'tough-cookie';

export type HeaderType = { [key:string]:string; };

export type LoginConfig = {
  username: string,
  password: string,
  baseUrl: string
}

export type OAuthConfig = {
  clientId: string,
  clientSecret: string,
  tokenUrl: string
}

export type ApiHelperOptions = {
  login?: LoginConfig,
  oauth?: OAuthConfig
}

const cookieJar = new CookieJar();

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
  private _authenticated: boolean = false
  private _accessToken: string | null = null

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
    if (!this._authenticated && this._options?.login != null) {
      await performLogin(this._options.login);
      this._authenticated = true;
    }

    if (!this._accessToken && this._options?.oauth != null) {
      this._accessToken = await fetchOAuthToken(this._options.oauth);
    }

    const cookies = await cookieJar.getCookieString(config.url);
    const headers = processHeaders(config?.headers);
    if (cookies) {
      headers['Cookie'] = cookies;
    }
    if (this._accessToken) {
      headers['Authorization'] = `Bearer ${this._accessToken}`;
    }

    const response = await fetch(config.url, {
      method: config.method,
      headers: headers,
      body: config?.body,
      redirect: 'manual'
    });

    for (const cookie of response.headers.getSetCookie()) {
      await cookieJar.setCookie(cookie, config.url);
    }

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

const performLogin = async (loginConfig: LoginConfig): Promise<void> => {
  const loginUrl = `${loginConfig.baseUrl}/auth/login?return_to=${encodeURIComponent(loginConfig.baseUrl)}`;

  try {
    let response = await fetch(loginUrl, {
      method: 'GET',
      redirect: 'manual'
    });

    for (const cookie of response.headers.getSetCookie()) {
      await cookieJar.setCookie(cookie, loginUrl);
    }

    if (response.status === 302 || response.status === 303) {
      const keycloakAuthUrl = response.headers.get('location')!;

      response = await fetch(keycloakAuthUrl, {
        method: 'GET',
        redirect: 'manual'
      });

      for (const cookie of response.headers.getSetCookie()) {
        await cookieJar.setCookie(cookie, keycloakAuthUrl);
      }

      const html = await response.text();
      const actionUrl = extractFormAction(html);
      const keycloakCookies = await cookieJar.getCookieString(keycloakAuthUrl);

      const formData = new URLSearchParams();
      formData.append('username', loginConfig.username);
      formData.append('password', loginConfig.password);

      response = await fetch(actionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': keycloakCookies || ''
        },
        body: formData.toString(),
        redirect: 'manual'
      });

      for (const cookie of response.headers.getSetCookie()) {
        await cookieJar.setCookie(cookie, actionUrl);
      }

      if (response.status === 302 || response.status === 303) {
        const callbackUrl = response.headers.get('location')!;
        const callbackCookies = await cookieJar.getCookieString(callbackUrl);

        response = await fetch(callbackUrl, {
          method: 'GET',
          headers: {
            'Cookie': callbackCookies || ''
          },
          redirect: 'manual'
        });

        for (const cookie of response.headers.getSetCookie()) {
          await cookieJar.setCookie(cookie, callbackUrl);
        }
      }
    }
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

const extractFormAction = (html: string): string => {
  const match = html.match(/action="([^"]+)"/);
  if (match && match[1]) {
    return match[1].replace(/&amp;/g, '&');
  }
  throw new Error('Could not find form action in HTML');
};

const fetchOAuthToken = async (oauthConfig: OAuthConfig): Promise<string> => {
  try {
    const formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials');
    formData.append('client_id', oauthConfig.clientId);
    formData.append('client_secret', oauthConfig.clientSecret);

    const response = await fetch(oauthConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    const data = await response.json();

    if (!data.access_token) {
      throw new Error('No access token in response');
    }

    return data.access_token;
  } catch (error) {
    console.error('OAuth token fetch failed:', error);
    throw error;
  }
};
