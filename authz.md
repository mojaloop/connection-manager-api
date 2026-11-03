# MCM Authorization

This service's authorization surface is its OpenAPI document,
`src/api/openapi.yaml`. Its guard, from `@mojaloop/authz`, reads the document
once at startup, and the service answers `GET /.authz/openapi` with the
document the guard loaded:

```js
const authz = await createGuard(path.join(__dirname, 'api/openapi.yaml'));
app.use(authz.expose());
```

## What the `x-authz` blocks mean

At the document root, `resourceTypes` lists the resource types the operations
are scoped by:

```yaml
x-authz:
  resourceTypes: [dfsps]
```

On an operation, `scopedBy` names the resource types its answer is scoped by.
It defaults to the type the outermost path parameter identifies, so
`/dfsps/{dfspId}/ca` is scoped by `dfsps` through `{dfspId}` and declares
nothing. Ids deeper in the path (an enrollment, an endpoint item) are business
data inside that DFSP, so they declare nothing either. `scopedBy` is written
out only where the path does not say it:

```yaml
x-authz:
  scopedBy: [dfsps]       # a listing, or an operation about the caller's own
                          # DFSP: no id in the path, rows are still per DFSP
  scopedBy: []            # rows belong to nobody: hub endpoint items, the peer
                          # JWS directory, monetary zones
```

A GET returning an array whose path binds no id must say which of these it is;
the guard refuses a document that leaves it unsaid, because an operation that
returns rows nothing scopes is how a tenant sees another tenant's data.

`internal: true` marks an operation answered inside the cluster only and never
scoped. `/health` is the one.

## Narrowing by scope

A controller asks the guard what the caller may reach of one type, and the
service narrows its own rows by that:

```js
Pki.getDFSPs(req.context, req.authz(req, 'dfsps'))

exports.getDFSPs = async (ctx, visible) =>
  visible.narrow((await DFSPModel.findAll()).map(exports.dfspRowToObject), (dfsp) => dfsp.id);
```

Asking about a type the caller may reach none of throws `Forbidden` (status
403), so a handler never holds an answer that reaches nothing. It reads
`restricted` to decide whether to narrow at all and never mistakes "reaches
nothing" for "reaches everything". A read with no request behind it, such as a
job or a test, says so by name:

```js
await PkiService.getDFSPs(ctx, EVERYTHING);
```
