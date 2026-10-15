# API Documentation

**Directory:** `docs/api/`

- `openapi.yaml` describes the intended HTTP API contract.
- Keep schemas, authentication requirements, status codes, and error responses aligned with implemented routes.
- Do not document an endpoint as available until it exists and is mounted.
- Use synthetic example data and never include secrets.
- Validate the OpenAPI document in CI with the project's chosen validator.
