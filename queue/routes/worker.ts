import { type FastifyPluginAsync } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { $Enums } from "../../prisma/client.js";
import prisma from "../prisma.js";

const queueNameParam = z.object({ name: z.string() });
const taskIdParam = z.object({ id: z.string() });
const taskSchema = z.object({
  id: z.string(),
  type: z.enum(["llm", "js", "http"]),
  payload: z.json(),
});

export const workerRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    "/queues/:name/claim",
    {
      schema: {
        params: queueNameParam,
        body: z.object({
          workerId: z.string(),
          max: z.number().int().min(1).max(100),
        }),
        response: {
          200: z.object({
            tasks: z.array(taskSchema),
            leaseUntil: z.string(),
          }),
        },
      },
    },
    async ({ params, body }) => {
      const now = new Date();
      const leaseUntil = new Date(now.valueOf() + 60_000);
      const tasks = await prisma.$queryRaw`
        WITH claimed AS (
          SELECT id
          FROM "Task"
          WHERE
            "queue" = ${params.name}
            AND "runAt" <= now()
            AND "status" = ${$Enums.TaskStatus.unfinished}
            AND ("leaseUntil" IS NULL OR "leaseUntil" < ${now})
          ORDER BY "runAt", id
          FOR UPDATE SKIP LOCKED
          LIMIT ${body.max}
        )
        UPDATE "Task" t
        SET "workerId" = ${body.workerId}, "leaseUntil" = ${leaseUntil}
        FROM claimed
        WHERE t.id = claimed.id
        RETURNING t.*`;

      return {
        tasks: z.array(taskSchema).parse(tasks),
        leaseUntil: leaseUntil.toISOString(),
      };
    },
  );

  app.post(
    "/tasks/:id/ack",
    {
      schema: {
        params: taskIdParam,
        body: z.object({ result: z.any() }),
        response: {
          200: z.object({ success: z.literal(true) }),
        },
      },
    },
    async (request) => {
      await prisma.task.update({
        where: { id: request.params.id },
        data: {
          status: $Enums.TaskStatus.success,
          result: request.body.result,
        },
      });

      return { success: true } as const;
    },
  );

  app.post(
    "/tasks/:id/nack",
    {
      schema: {
        params: taskIdParam,
        body: z.object({ reason: z.any() }),
        response: {
          200: z.object({ success: z.literal(true) }),
        },
      },
    },
    async ({ params, body }) => {
      const task = await prisma.task.findUniqueOrThrow({
        where: { id: params.id },
      });

      const update =
        task.attempts + 1 < task.maxAttempts
          ? {
              attempts: { increment: 1 },
              runAt: new Date(Date.now() + 60_000 * 2 ** task.attempts),
              workerId: null,
              leaseUntil: null,
            }
          : {
              attempts: { increment: 1 },
              status: $Enums.TaskStatus.dlq,
              result: body.reason,
              leaseUntil: null,
            };

      await prisma.task.update({ where: { id: params.id }, data: update });

      return { success: true } as const;
    },
  );

  app.post(
    "/tasks/:id/extend",
    {
      schema: {
        params: taskIdParam,
        body: z.object({
          workerId: z.string(),
        }),
        response: {
          200: z.object({ success: z.literal(true) }),
        },
      },
    },
    async ({ params, body }) => {
      await prisma.task.update({
        where: {
          id: params.id,
          workerId: body.workerId,
          status: $Enums.TaskStatus.unfinished,
        },
        data: { leaseUntil: new Date(Date.now() + 60_000) },
      });
      return { success: true } as const;
    },
  );
};
