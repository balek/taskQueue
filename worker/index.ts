import { $Enums } from "../prisma/client.js";
import httpHandler from "./handlers/http.js";
import jsHandler from "./handlers/js.js";
import llmHandler from "./handlers/llm.js";
import { register, start } from "./harness.js";

register($Enums.TaskType.http, httpHandler);
register($Enums.TaskType.js, jsHandler);
register($Enums.TaskType.llm, llmHandler);
await start("testQueue");
