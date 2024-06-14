import { DistributeSharedWorker } from "../../../src/distribute.ts";
import { SharedWorkerPonyfill } from "../../../src/ponyfill.ts";

export function run(type = "distributed") {
  if (type === "distributed") {
    return new DistributeSharedWorker("./worker.ts", { type: "module" });
  } else {
    return new SharedWorkerPonyfill("./worker.ts");
  }
}