import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime, truncateId } from "@/utils";
import { useRouter } from "next/router";

type QueueStats = { ready: number; inFlight: number; dlq: number };
type DlqTask = {
  id: string;
  type: string;
  payload: unknown;
  updatedAt: string;
  attempts: number;
  result: unknown | null;
};

export default function QueuePage() {
  const router = useRouter();
  const queueName = Array.isArray(router.query.name) ? router.query.name[0] : router.query.name;

  const statsQuery = useQuery<QueueStats>({
    queryKey: ["queue", queueName, "stats"],
    queryFn: async () => {
      const response = await api.get(`/queues/${encodeURIComponent(queueName!)}/stats`);
      return response.data as QueueStats;
    },
    enabled: !!queueName,
  });

  const dlqQuery = useQuery<{ total: number; tasks: DlqTask[] }>({
    queryKey: ["queue", queueName, "dlq"],
    queryFn: async () => {
      const response = await api.get(`/queues/${encodeURIComponent(queueName!)}/dlq?page=1&pageSize=20`);
      return response.data as { total: number; tasks: DlqTask[] };
    },
    enabled: !!queueName,
  });

  const statsRows = useMemo(() => [
    { label: "Ready", value: statsQuery.data?.ready ?? 0, variant: "default" as const },
    { label: "In flight", value: statsQuery.data?.inFlight ?? 0, variant: "secondary" as const },
    { label: "DLQ", value: statsQuery.data?.dlq ?? 0, variant: "outline" as const },
  ], [statsQuery.data]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Queue details</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{queueName}</h1>
            <p className="max-w-2xl text-base text-slate-600">Current queue metrics and recent dead-letter tasks.</p>
          </div>
          <Link href="/" className="shrink-0">
            <Button variant="secondary">Back to all queues</Button>
          </Link>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Queue stats</CardTitle>
                  <CardDescription>Live counts for ready tasks, leased work, and DLQ.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {statsQuery.isLoading ? (
                <p className="text-sm text-slate-600">Loading stats…</p>
              ) : statsQuery.isError ? (
                <p className="text-sm text-red-600">Unable to fetch stats.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-3">
                  {statsRows.map((stat) => (
                    <div key={stat.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                      <p className="mt-3 text-3xl font-semibold text-slate-950">{stat.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Dead letter queue</CardTitle>
                <CardDescription>Recently failed tasks moved to the DLQ.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {dlqQuery.isLoading ? (
                <p className="text-sm text-slate-600">Loading DLQ tasks…</p>
              ) : dlqQuery.isError ? (
                <p className="text-sm text-red-600">Unable to load DLQ tasks.</p>
              ) : dlqQuery.data && dlqQuery.data.tasks.length ? (
                <div className="space-y-4">
                  {dlqQuery.data.tasks.map((task) => (
                    <div key={task.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{truncateId(task.id, 12)}</p>
                          <p className="text-sm text-slate-600">Type: {task.type}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Attempts {task.attempts}</Badge>
                          <span className="text-sm text-slate-500">{formatRelativeTime(task.updatedAt)}</span>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2 text-sm text-slate-700">
                        <div>
                          <p className="font-medium text-slate-900">Result</p>
                          <pre className="mt-1 overflow-x-auto rounded-2xl bg-slate-100 p-3 text-xs text-slate-700">{JSON.stringify(task.result, null, 2)}</pre>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">Payload</p>
                          <pre className="mt-1 overflow-x-auto rounded-2xl bg-slate-100 p-3 text-xs text-slate-700">{JSON.stringify(task.payload, null, 2)}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600">No DLQ tasks found for this queue.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
