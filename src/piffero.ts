import { Readable, Stream } from "stream";
import { MasterHandler } from "./handler/mastehandler";
import { JSONPath } from "./jsonpath";

export class Piffero {
  static findByPath(stream: Readable, jsonPath: string = "$"): Stream {
    const handler = new MasterHandler();
    let parsedPath = JSONPath.parse(jsonPath);
    return handler.parse(stream, parsedPath);
  }

  static findAsString(
    callback: (result, err?) => void,
    stream: Readable,
    jsonPath: string = "$"
  ) {
    const handler = new MasterHandler();
    let parsedPath = JSONPath.parse(jsonPath);
    handler.parse(stream, parsedPath, true, callback);
  }

  static findAsPromise(
    stream: Readable,
    jsonPath: string = "$"
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      Piffero.findAsString(
        (result, err) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        },
        stream,
        jsonPath
      );
    });
  }
}
