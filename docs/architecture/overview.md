# System Architecture Overview

## Purpose

MedOrbits is structured as an education and career services platform with public pages, authenticated user workflows, employer features, administrative tools, and a backend API.

## Logical Layers

1. **Presentation:** HTML pages, CSS, browser JavaScript, and static public resources.
2. **HTTP application:** Node.js server and Express-style routes, middleware, and controllers, where implemented.
3. **Business services:** Application rules for users, education records, admissions, jobs, documents, notifications, payments, and subscriptions.
4. **Persistence:** MySQL database, repositories/models, and version-controlled SQL migrations.
5. **Integrations:** Email, file storage, AI, and payment providers when configured.
6. **Operations:** Monitoring, backups, deployment workflows, background workers, and scheduled jobs.

## Design Principles

- Keep business rules out of presentation code where practical.
- Validate untrusted input at system boundaries.
- Enforce authorization on the server for every private resource.
- Keep credentials in environment configuration or a secret manager.
- Make payment and background-job processing idempotent where possible.
- Separate public educational resources from private applicant documents.
- Log operational events without exposing secrets or unnecessary personal data.

## Implementation Note

This is a logical architecture based on the intended repository structure. Confirm which components are implemented and active before treating this document as a production system diagram.
