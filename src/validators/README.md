# MedOrbits validators

Validators implement simple allowlist-based request filtering and basic email checks without an additional validation library.

For production, extend each validator with field-specific constraints, enum checks, length limits, numeric bounds, date parsing and nested JSON schema validation. Do not treat validation as authorization.
