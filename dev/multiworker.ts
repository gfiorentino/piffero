import { Worker } from "worker_threads";

const responseMap: Map<number, any> = new Map();
const workerPool = [];
let last_index = 0;
let response_id = 1;

for (let index = 0; index < 3; index++) {
  const worker = new Worker("./dev/worker.js");
  workerPool.push(worker);
  worker.on("message", (result) => {
    handler(result);
  });
}

function getWorker(): Worker {
  last_index++;
  if (last_index === workerPool.length) {
    last_index = 0;
  }
  return workerPool[last_index];
}

export function getPath(req, res) {
  const path = req.params.path;
  const id_ = response_id++;
  responseMap.set(id_, res);
  let worker = getWorker();
  worker.postMessage({ path, id: id_ });
}

function handler(msg) {
  let currentResponse = responseMap.get(msg.id);
  currentResponse.setHeader("Content-Type", "application/json");
  currentResponse.send(msg.result);
  responseMap.delete(msg.id);
}
