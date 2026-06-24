# Task Queue

## Build and run

`docker compose -f compose.prod.yml up`

## Run test

`docker compose -f compose.prod.yml test`

## Features

1. `queue` service is a backend for managing tasks (queue/routes/user.ts) and coordinating workers (queue/routes/worker.ts). It uses PostgreSQL as a storage. Prisma ORM is used for simple queries.
2. `worker` directory contains a library for handler registration and starting the worker process (worker/harness.ts). It also contains the full worker process with test task handlers (worker/index.ts).
3. `ui` is a simple AI-generated NextJs service to watch queue list, stats and DLQ tasks for a selected queue.
4. `tests` contains only one concurrency test.

## Run in dev mode

1. Run `echo UID=$(id -u) >.env`. For MacOS also run `echo HOME=$HOME >>.env`
2. Run `docker compose up init` to install dependencies and generate Prisma client
3. Start applications to develop:

- `docker compose up queue`
- `docker compose up worker`
- `docker compose up ui`
