import { Readable, Stream } from "stream";
import { MasterHandler } from "./handler/mastehandler";
import { JSONPath } from "./jsonpath";
import { PifferoOpt } from "./pifferostatus";

export class Piffero {
  static findByPath(stream: Readable, jsonPath: string = "$"): Stream {
    const handler = new MasterHandler();
    let parsedPath = JSONPath.parse(jsonPath);
    return handler.parse(stream, parsedPath, PifferoOpt.stream);
  }

  static findAsString(
    callback: (result, err?) => void,
    stream: Readable,
    jsonPath: string = "$"
  ) {
    const handler = new MasterHandler();
    let parsedPath = JSONPath.parse(jsonPath);
    handler.parse(stream, parsedPath, PifferoOpt.string, callback);
  }
}
