import Fastify from "fastify";
import { userRoutes } from "./routes/user.js";
import { workerRoutes } from "./routes/worker.js";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

const server = Fastify({});
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

server.addHook("preHandler", (req, res, done) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST");
  res.header("Access-Control-Allow-Headers", "*");

  done();
});
server.register(userRoutes);
server.register(workerRoutes);

server.listen({ port: 3001, host: "0.0.0.0" });
