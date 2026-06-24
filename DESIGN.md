## Storage choice and why.

I supposed that in this case finished tasks data should not be truncated and has to be stored for a long time. So keeping this data in memory (Redis for instance) doesn't seem as a good idea. As there were no requirement on a high throughput, I decided to keep things simple and use PostgreSQL for everything. Partial index on inflight tasks should make it quite scalable.

## How `claim` works under concurrency (SQL or pseudo-ops).

claim is made with a usual SELECT FOR UPDATE SKIP LOCKED + UPDATE query [query](./queue/routes/worker.ts#L39). Safe and fast.

## Lease model: duration, renewal, expiry, the recovery query.

worker library runs [setInterval](./worker/harness.ts#L33) with lease updates for each processing task. There is no cron process, controlling the expiry. Instead the lease is checked during task claiming inside the SQL query.

## What happens when a worker dies holding a task — walk it through state-by-state.

Lease expiry is controlled by SQL queries (claim and stats). When the lease time is over, the task will be claimed in the next request.

## Task-type dispatch: how the harness routes a claimed task to its handler, and how the

three handlers are isolated.

Handlers are stored in a simple [map](./worker/harness.ts#L7-11). `js` handler runs code using `node:vm` module for some isolation and time limiting.

## Retry policy: backoff curve, max attempts, what counts as retryable — including how retryability differs by task type.

Backoff is implemented in the [/nack endpoint](./queue/routes/worker.ts#L104-118) by rescheduling the task. Max attempts are stored in task rows, but it's always set to 3 by column's default value. All errors are retryable.

## Idempotency model end-to-end (enqueue dedupe + consumer side).

Client generated the dedupeKey and send it in the schedule request and retries. It's checked by Postgres unique index during task insert. Time windowing is not supported.

## What you'd build next with another day, and what you cut and why

- Much more tests. Even the current test is single-threaded, so it doesn't completely solve the concurrency requirement. Making a real multi-thread with overlapping control is tricky (because we need to share the test state somehow).
- More code infratructure: sharing of API types between services and for testing.
- Better `js` tasks isolation. Current handler blocks the thread. WebWorkers should be used. In case of untrusted code execution the deep research of specialized solutions is needed.
- Better handling of edge cases like temproary disconnections between the worker and the queue (skipped lease updates).
