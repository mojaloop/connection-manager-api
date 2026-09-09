# [OUTDATED] Authentication and Authorization with OAuth2 and WSO2

> **IMPORTANT**: This document is outdated. Please refer to the current authentication documentation in [docs/authentication.md](./docs/authentication.md) which describes the OpenID Connect implementation with Keycloak.

We're using OAuth2 to authenticate and authorize the access to the API.

## Definitions

The API uses OpenAPI to specify the security options. See [the API document](./src/api/openapi.yaml).

This is the current definition ( at v1.3.3 ):

```yaml
securityDefinitions:
  OAuth2:
    type: oauth2
     # The flow used by the OAuth2 security scheme. Valid values are "implicit", "password", "application" or "accessCode".
    flow: "password"
    tokenUrl: https://OAUTH2_SERVER:9443/oauth2/token
    scopes:
      pta: Portal Technical Administrator
      mta: Mojabox Technical Administrator
      everyone: All logged in users
security:
  - OAuth2: [ pta ] # most restrictive role
```


So, we're using OAuth2 password flow or [Resource owner password credentials](https://swagger.io/docs/specification/authentication/oauth2/) which: _Requires logging in with a username and password. Since in that case the credentials will be a part of the request, this flow is suitable only for trusted clients (for example, official applications released by the API provider)._ On WSO2 is called [Resource Owner Password Credentials Grant](https://docs.wso2.com/display/IS570/Resource+Owner+Password+Credentials+Grant) which says that: _The resource owner password credentials grant type is suitable in cases where the resource owner has a trust relationship with the client (e.g., a service's own mobile client) and in situations where the client can obtain the resource owner's credentials. Instead of redirecting the user to the authorization server, the client itself will ask the user for the resource owner's username and password. The client will then send these credentials to the authorization server along with the client's own credentials._

## Auth Flow

The API provides a `/api/login` operation, which receives a `username` and `password` and if successful returns a JSON payload with the decoded JWT payload data, and sets a Cookie with the Auth Token.

Example user payload returned to the browser; the claims can be extended to add information such as the DFSP id, and return it to the UI:

```json
{
  "ok": true,
  "token": {
    "payload": {
      "at_hash": "......",
      "aud": "......",
      "sub": "hubadmin",
      "nbf": ......,
      "azp": "......",
      "amr": [
        "password"
      ],
      "iss": "https://......:9443/oauth2/token",
      "groups": [
        "Application/PTA",
        "Internal/everyone"
      ],
      "exp": ......,
      "iat": ......,
      "dfspId": 'SOME-ID'
    }
  }
}
```

The client, usually the Web App, never contacts the OAuth server. We use [httpOnly cookies](https://www.owasp.org/index.php/HttpOnly) with the `[sameSite = strict` restriction](https://www.owasp.org/index.php/SameSite) to enhance security; the cookies aren't visible from JavaScript.

The client needs to send this cookie in the subsequent calls to the API.

## Reset password

### First step
To check if a reset password is required for a user, use the `/api/login` operation that the API provides. This operation receives the `username` and `password`, and it will check on the token returned by the WSO2 identity server, to determine if a password reset is required. If that is the case, the API will return a `userguid` and an `askPassword` flag as a response, and those will be useful later when doing the obligatory password reset after the first login.

Example response:
{  
  "askPassword": true,  
  "userguid": "uuid"
}

### Second step
To reset the password, the API provides an `/api/resetPassword` operation, which receives the `username`, `newPassword` and `userguid` provided by the login operation initially. If the password change is succesful, it will return an empty response with an HTTP status code 204. The next time the user wants to log in, theywill have to use the new password.

## Two-factor authentication

### First step
When the user calls the `api/login` operation, and two-factor authentication (2FA) is enabled (environment variable `AUTH_2FA_ENABLED` set to `true`), the server willcheck if the user is already enrolled on 2FA or not, and depending on this, it willreturn two different responses: 
- Response when user is not 2FA-enrolled: 
{  
  "sharedSecret": "token",  
  "issuer": "issuer string",  
  "enrolled": false,  
  "2faEnabled": true 
}

The `sharedSecret` can be used to build a QR code.  To achieve this, the api is using Time-Based One Time Password (TOTP) through [WSO2 Identity Server](https://docs.wso2.com/display/ISCONNECTORS/TOTP+Authenticator)

- Response when user is 2FA-enrolled: 
{  
  "enrolled": true,  
  "2faEnabled": true 
}

### Second step
For the second step of two-factor authentication, use the `api/login2step` operation, which receives the `username`, `password`, and a token generated by an authenticator app (`generatedToken`). The token is generated using the `sharedSecret` provided in the first step. If the request is successful, the API returns a JSON payload with the decoded JWT payload data, and it also sets a Cookiewith the Auth Token.

## Users and Roles

The operations are restricted by role and by user, using the swagger definitions.

For example:

```yaml
/environments/{envId}/dfsps/{dfspId}/ca:
    post:
        security:
            - OAuth2: [ mta, pta ]
```

This specifies that the user needs to have either the `mta` or `pta` role.

Access is further restricted by each user.

Information that is related to a DFSP ( all operations that start with `/environments/{envId}/dfsps/{dfspId}`) is accesible only if the user belongs to the DFSP's security group or if it has the `pta` role.

Each DFSP has its own securityGroup which is set when the DFSP is created. The API server sets it to `'Application/DFSP:' + dfsp.id`

So if we're creating DFSP with id `MTN CI`, its security group will be called `Application/DFSP:MTN CI`

## Creating users

When creating a DFSP admin user:

* add it to the `Application/MTA` group.
* create the corresponding security group and to add the user to it. If should be named `Application/DFSP:` + dfsp.id

## Errors

We use the standard `401` and `403` status codes. If returning a `403`, the server MAY also set the following header in the response:

X-AUTH-ERROR: user does not have the required role Application/DFSP:TEST_DFSP_1
