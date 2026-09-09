# MCM Authorization

This service's entire authorization surface is its OpenAPI document,
`src/api/openapi.yaml`. The platform reads it at deploy time and generates the
gateway rules and the permission model from it; this repository contains no
rules file, no permission model, and no roles.

## What the document declares

Each operation is one permission, named `mcm.<operationId>`:

```yaml
/dfsps/{dfspId}/ca:
  get:
    operationId: getDFSPca
    summary: Returns the DFSP CA certificates    # shown in the role UI
    security:
    - session: []                                # a human's Kratos session
    - machineToken: []                           # a machine's Hydra token
```

Everything else is derived from `scopedBy`, the one thing an operation says
about authorization: which resource types its answer is scoped by. Where the path binds an
id for a declared type the operation is checked against `dfsps/{dfspId}`, and
where it does not it is checked against the service singleton. Either way the
declared types are what reaches the caller in `X-Scope`. Ids deeper in the path
(an enrollment, an endpoint item) are business data inside an already-authorized
DFSP, so they declare nothing.

`scopedBy` defaults to the type the outermost path parameter identifies, and
is written out only where the path does not say it:

```yaml
x-authz:
  scopedBy: [dfsps]       # a listing, or an operation about the caller's own
                          # DFSP: no id in the path, rows are still per DFSP
  scopedBy: []            # rows belong to nobody: hub endpoint items, the peer
                          # JWS directory, monetary zones

security: []              # anonymous, no permission exists (/health)
```

A GET returning an array whose path binds no id must say which of these it is;
silence fails the build, because an operation that returns rows nothing scopes
is how a tenant sees another tenant's data.

`x-authz` accepts only `scopedBy` and `permission` (an explicit, stable
permission name that survives handler renames), plus `service` at the document
root. Anything else fails the build.

## How it is registered

The platform chart registers the service in `global.authz`, naming where the
API document sits inside the image and which host serves it:

```yaml
global:
  authz:
    - name: mcm
      image: mojaloop/connection-manager-api:<tag>
      spec: /opt/app/src/api/openapi.yaml
      url:
        host: api.mcm.example.com
        # path: /mcm      # when served under a prefix of a shared host
```

The aggregator mounts the image, reads that document, and generates this
service's access rules and namespace with the host and mount path filled in.

The local stack does the same thing through `prepare-authz` in
`docker-compose.yaml`, which needs the tooling image once:

```
docker build -t mojaloop/ml-iam-services:local ../ml-iam-services
```

## What the service receives

Requests arrive already authorized, carrying one header:

```
X-Scope   dfsps=dfsp-a,dfsp-b   |   dfsps=*   |   none
```

The resource type is spelled as the path segment that carries it, so DFSP rows
arrive under `dfsps`. `none` carries no types and nothing is visible; the
gateway strips any inbound copy, so absence cannot be forged. The service never
learns who the caller is: who did what is answered by the decision endpoint's
record, which carries the subject, the checks and the verdict for every
request.

The header format is not this repository's to define. `@mojaloop/authz` holds
it, so the endpoint that writes the header and every service that reads it
cannot drift, and `src/authz/scope.js` is only the name of the one resource
type this service owns rows of:

```js
const { INTERNAL, parseScope, idsInScope } = require('@mojaloop/authz');

const DFSP_RESOURCE = 'dfsps';
const dfspIdsInScope = (scope) => idsInScope(scope, DFSP_RESOURCE);
```

Row filtering is then one clause in the query layer:

```js
const ids = dfspIdsInScope(req.scope);
return ids === undefined ? rows : rows.filter((r) => ids.includes(r.id));
```

`undefined` means no restriction, an empty array means nothing is visible, and
the two must never be confused. A call with no scope at all raises rather than
reading as unrestricted, so a service-to-service read says so by name:

```js
await PkiService.getDFSPs(ctx, INTERNAL);
```

## Roles and grants

Roles are deployment data composed from the permissions this service
advertises, held in the IAM and written only by it. This repository declares
nothing about who may do what, and holds no Keto access.

When it creates a DFSP it creates that DFSP's machine client and admin
identity, then names the resource and those two principals to the IAM:

```
POST iam-provisioning/provision
{ "type": "dfsps", "id": "dfsp7",
  "principals": { "admin": "<identity id>", "machine": "dfsp7" } }
```

Which roles that implies is the deployment's decision. Deleting the DFSP
reverses it, and the IAM answers with the identities left holding no role, so
this service can retire an operator who works for nobody else without reading
the permission graph.

## References

- [Ory Permission Language](https://www.ory.sh/docs/keto/reference/ory-permission-language)
- [Zanzibar paper](https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/)
