import { Readable, Stream } from "stream";
import { MasterHandler } from "./handler/mastehandler";
import { JSONPath } from "./jsonpath";

export class Piffero {
  static findByPath(stream: Readable, jsonPath: string = "$"): Stream {
    const handler = new MasterHandler();
    let parsedPath = JSONPath.parse(jsonPath);
    return handler.parse(stream, parsedPath, { mode: "stream" });
  }

  static findAsString(
    callback: (result, err?) => void,
    stream: Readable,
    jsonPath: string = "$"
  ) {
    const handler = new MasterHandler();
    let parsedPath = JSONPath.parse(jsonPath);
    handler.parse(stream, parsedPath, { mode: "string" }, callback);
  }
}
