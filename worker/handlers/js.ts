import vm from "node:vm";

export default async function jsHandler(task: any) {
  return vm.runInContext(task.payload, vm.createContext({}), {
    timeout: 100,
  });
}
