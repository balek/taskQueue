import { describe, expect, it } from "vitest";
import prisma from "../queue/prisma.js";
import { delay, register, start, TaskHandler } from "../worker/harness.js";
import { $Enums } from "../prisma/client.js";

const QUEUE = "testConcurrencyQueue";
const TASK_COUNT = 50;

function nextType(index: number) {
  const types = [$Enums.TaskType.llm, $Enums.TaskType.js, $Enums.TaskType.http];
  return types[index % types.length];
}

describe("concurrent claim", () => {
  it("processes all tasks at least once without overlap", async () => {
    await prisma.task.deleteMany({ where: { queue: QUEUE } });
    await prisma.task.createMany({
      data: [...Array(TASK_COUNT)].map((_v, i) => ({
        queue: QUEUE,
        status: $Enums.TaskStatus.unfinished,
        type: nextType(i),
        payload: { index: i },
        runAt: new Date(),
      })),
    });

    const processing: Record<string, { start: number; end?: number }> = {};
    const overlaps: string[] = [];

    const handler: TaskHandler = async (task) => {
      const id = task.id;
      if (processing[id] && processing[id].end == null) {
        overlaps.push(id);
      }
      processing[id] = { start: Date.now() };
      await delay(1000);
      processing[id].end = Date.now();
      return { ok: true, id };
    };

    register("llm", handler);
    register("js", handler);
    register("http", handler);

    const abortController = new AbortController();
    [...Array(4)].map(() => start(QUEUE, abortController.signal));
    await delay(2500);
    abortController.abort();

    const statusCounts = await prisma.task.groupBy({
      by: ["status"],
      where: { queue: QUEUE },
      _count: true,
    });
    expect(statusCounts).toEqual([
      { status: $Enums.TaskStatus.success, _count: TASK_COUNT },
    ]);
    expect(Object.keys(processing)).toHaveLength(TASK_COUNT);
    expect(overlaps).toHaveLength(0);
  });
});
