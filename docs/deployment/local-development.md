# Local Development

## Prerequisites

- A supported Node.js version matching `.nvmrc` or the documented runtime policy.
- Dependencies installed from the committed package lockfile.
- A local MySQL instance or isolated development database if required by the current implementation.
- An environment file based on `.env.example`, with local-only credentials.

## Setup

1. Clone the repository.
2. Select the supported Node.js version.
3. Install dependencies using the package manager and lockfile.
4. Create local environment configuration without committing it.
5. Create an isolated development database and apply reviewed migrations.
6. Run environment and data validation scripts.
7. Start the application using the documented package script.
8. Run the relevant tests.

## Safety

Never copy production secrets or private user records into a local environment. Use synthetic data and sandbox payment credentials. Do not expose a local development server publicly without appropriate controls.
