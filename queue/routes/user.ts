import { type FastifyPluginAsync } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import prisma from "../prisma.js";
import { $Enums, Prisma } from "../../prisma/client.js";

const taskTypeSchema = z.enum($Enums.TaskType);
const taskStatusSchema = z.enum(["ready", "inFlight", "dlq"]);
const queueNameParam = z.object({ name: z.string() });
const taskIdParam = z.object({ id: z.string() });

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    "/queues",
    {
      schema: {
        response: {
          200: z.object({ queues: z.array(z.object({ name: z.string() })) }),
        },
      },
    },
    async (_req, reply) => {
      const queues = await prisma.$queryRaw<{ name: string }[]>`
        SELECT DISTINCT "queue" as "name"
        FROM "Task"
      `;

      return reply.status(200).send({ queues });
    },
  );

  app.post(
    "/queues/:name/tasks",
    {
      schema: {
        params: queueNameParam,
        body: z.object({
          type: taskTypeSchema,
          payload: z.any(),
          delay: z.number().int().min(0).optional(),
          dedupeKey: z.string().optional(),
        }),
        response: {
          200: z.object({ id: z.string() }),
          201: z.object({ id: z.string() }),
        },
      },
    },
    async ({ params, body }, reply) => {
      try {
        const task = await prisma.task.create({
          data: {
            queue: params.name,
            status: $Enums.TaskStatus.unfinished,
            type: body.type,
            payload: body.payload,
            runAt: new Date(Date.now() + (body.delay ?? 0) * 1000),
            dedupeKey: body.dedupeKey,
          },
        });

        return reply.status(201).send({ id: task.id });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          const task = await prisma.task.findUniqueOrThrow({
            where: { dedupeKey: body.dedupeKey },
          });
          return reply.status(200).send({ id: task.id });
        }
        throw error;
      }
    },
  );

  app.get(
    "/queues/:name/stats",
    {
      schema: {
        params: queueNameParam,
        response: {
          200: z.record(taskStatusSchema, z.number()),
        },
      },
    },
    async ({ params }) => {
      const now = new Date();
      const [ready, inFlight, dlq] = await prisma.$transaction([
        prisma.task.count({
          where: {
            queue: params.name,
            status: $Enums.TaskStatus.unfinished,
            OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
          },
        }),
        prisma.task.count({
          where: {
            queue: params.name,
            status: $Enums.TaskStatus.unfinished,
            leaseUntil: { gt: now },
          },
        }),
        prisma.task.count({
          where: {
            queue: params.name,
            status: $Enums.TaskStatus.dlq,
          },
        }),
      ]);

      return { ready, inFlight, dlq };
    },
  );

  app.get(
    "/queues/:name/dlq",
    {
      schema: {
        params: queueNameParam,
        querystring: z.object({
          page: z.coerce.number().int().min(1),
          pageSize: z.coerce.number().int().min(1).max(100),
        }),
        response: {
          200: z.object({
            total: z.number().int(),
            tasks: z.array(
              z.object({
                id: z.string(),
                type: taskTypeSchema,
                payload: z.any(),
                updatedAt: z.date(),
                attempts: z.number(),
                result: z.any().nullable(),
              }),
            ),
          }),
        },
      },
    },
    async ({ query, params }) => {
      const where = { queue: params.name, status: $Enums.TaskStatus.dlq };
      const tasks = await prisma.task.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      });
      const total = await prisma.task.count({ where });

      return { tasks, total };
    },
  );

  app.post(
    "/tasks/:id/requeue",
    {
      schema: {
        params: taskIdParam,
        response: {
          200: z.object({ id: z.string(), requeued: z.boolean() }),
        },
      },
    },
    async ({ params: { id } }) => {
      await prisma.task.update({
        where: { id },
        data: {
          status: $Enums.TaskStatus.unfinished,
          runAt: new Date(),
          workerId: null,
          leaseUntil: null,
        },
      });
      return { id, requeued: true };
    },
  );
};
