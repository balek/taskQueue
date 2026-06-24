export default async function llmHandler(task: any) {
  // Stubbed LLM provider: echo the prompt
  const payload = task.payload || {};
  const prompt = payload.prompt || payload.messages || "no prompt";
  return { completion: `echo: ${JSON.stringify(prompt)}` };
}
