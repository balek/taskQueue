-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('llm', 'js', 'http');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('unfinished', 'success', 'dlq');

-- CreateTable
CREATE TABLE "Task" (
    "id" UUID NOT NULL,
    "queue" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL,
    "type" "TaskType" NOT NULL,
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "runAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workerId" UUID,
    "leaseUntil" TIMESTAMPTZ,
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Task_dedupeKey_key" ON "Task"("dedupeKey");

-- CreateIndex
CREATE INDEX "Task_queue_runAt_idx" ON "Task"("queue", "runAt") WHERE ("status" = 'unfinished');

-- CreateIndex
CREATE INDEX "Task_queue_status_updatedAt_idx" ON "Task"("queue", "status", "updatedAt");
