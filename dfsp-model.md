# DFSPs

DFSPs have two public properties regarding their identity:

* name. String ( max 512 ). It's a descriptive name.
* dfsp_id. String ( max 512 ). Used to represent the DFSP's "FspId" as described in the Mojaloop API. Section 7.3.16 FspId 

Constraint: Each dfsp_id must be unique in an environment

Example:

```json
{
"name": "MZ DFSP for EUR currency",
"dfsp_id": "DFSP-EUR"
}
```

or

```json
{
  "dfspId": "DFSP1",
  "name": "DFSP 1"
}
```

Internally, there's an "id" attribute which is the PK:

```csv
# id, env_id, name, dfsp_id, security_group
'7', '2', 'DFSP 1', 'DFSP1', 'Application/DFSP:DFSP1'
```

but this is NOT seen by the user. They use the dfspId attribute on the operations URLs, as in:

`POST "http://mcm.localhost/api/environments/2/dfsps/DFSP1/enrollments/inbound"`


About the security groups:

The security group for a DFSP is created from the dfsp_id, replacing spaces with dashes.
So if `dfsp_id` = 'DFSP 1', then `security_group="DFSP-1"`
