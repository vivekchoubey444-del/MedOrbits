# MedOrbits repositories

Repositories contain parameterized MySQL queries and hard-coded table/column allowlists.

Available repositories: user, session, course, college, university, application, document, job, candidate, employer, payment, subscription.

The generic CRUD repository is intended for trusted server-side callers. Controllers must apply ownership checks and field allowlists. Do not expose generic update/delete operations to public users without authorization.
