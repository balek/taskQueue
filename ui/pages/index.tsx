import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/api";

type QueueName = { name: string };

export default function HomePage() {
  const { data, isLoading, isError } = useQuery<QueueName[]>({
    queryKey: ["queues"],
    queryFn: async () => {
      const response = await api.get("/queues");
      return response.data.queues as QueueName[];
    },
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Task Queue</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">All queues</h1>
          <p className="max-w-2xl text-base text-slate-600">Browse queue names and inspect statistics with DLQ details.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Queues</CardTitle>
                <CardDescription>Navigate into a queue to see its current stats and dead-letter tasks.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-slate-600">Loading queues…</p>
            ) : isError ? (
              <p className="text-sm text-red-600">Unable to load queues.</p>
            ) : data && data.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {data.map((queue) => (
                  <Link key={queue.name} href={`/queues/${encodeURIComponent(queue.name)}`} className="block rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:border-slate-300 hover:bg-white">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-slate-950">{queue.name}</p>
                        <p className="mt-1 text-sm text-slate-600">View stats and DLQ tasks.</p>
                      </div>
                      <Button variant="secondary">Inspect</Button>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600">No queues found.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
