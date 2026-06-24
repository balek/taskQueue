import axios from "axios";
import { $Enums } from "../prisma/client.js";
import { randomUUID } from "node:crypto";

export type TaskHandler = (task: Task) => Promise<any>;

const handlers: Partial<Record<$Enums.TaskType, TaskHandler>> = {};

export function register(type: $Enums.TaskType, handler: TaskHandler) {
  handlers[type] = handler;
}

interface Task {
  id: string;
  type: $Enums.TaskType;
}

const WORKER_THREADS = 10;
const QUEUE_ERROR_TIMEOUT = 1000;
const MISSING_TASKS_TIMEOUT = 1000;
const TASK_CLAIM_BATCHING_TIMEOUT = 100;

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const queueClient = axios.create({ baseURL: "http://queue:3001" });

const workerId = randomUUID().toString();
export const start = async (queue: string, abort?: AbortSignal) => {
  let threads: Record<string, Promise<unknown>> = {};

  const runTaskThread = async (task: Task) => {
    const interval = setInterval(async () => {
      await queueClient.post(`/tasks/${task.id}/extend`, { workerId });
    }, 10000);

    try {
      const handler = handlers[task.type];
      if (!handler)
        throw new Error("No handler registred for type: " + task.type);
      const result = await handler(task);
      console.debug(
        `Task ${task.type} ${task.id} finished with result: `,
        result,
      );
      await queueClient.post(`/tasks/${task.id}/ack`, { result });
    } catch (error) {
      console.debug(`Task ${task.type} ${task.id} failed with error: ${error}`);
      await queueClient.post(`/tasks/${task.id}/nack`, {
        reason:
          error && typeof error === "object"
            ? {
                ...error,
                name: "name" in error ? error.name : undefined,
                message: "message" in error ? error.message : undefined,
                stack: "stack" in error ? error.stack : undefined,
                cause: "cause" in error ? error.cause : undefined,
              }
            : error,
      });
    } finally {
      delete threads[task.id];
      clearInterval(interval);
    }
  };

  while (!abort?.aborted) {
    try {
      const {
        data: { tasks },
      } = await queueClient.post(`/queues/${queue}/claim`, {
        workerId,
        max: WORKER_THREADS - Object.keys(threads).length,
      });

      if (!tasks.length) {
        await delay(MISSING_TASKS_TIMEOUT);
        continue;
      }

      for (const task of tasks) {
        threads[task.id] = runTaskThread(task);
      }
      await Promise.race(Object.values(threads));

      if (Object.keys(threads).length) await delay(TASK_CLAIM_BATCHING_TIMEOUT);
    } catch (error) {
      console.error("Could not claim tasks:", error);
      await delay(QUEUE_ERROR_TIMEOUT);
    }
  }

  await Promise.all(Object.values(threads));
};
