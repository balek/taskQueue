export default async function httpHandler(task: any) {
  const { method = "GET", url, headers, body } = task.payload;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text };
}
