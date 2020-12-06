import { Readable, Stream } from "stream";
import { callbackify } from "util";
import { MasterHandler } from "./handler/mastehandler";
import { PifferoOpt } from "./pifferostatus";

export class Piffero {
  static findByPath(stream: Readable, jsonPath: string = "$"): Stream {
    const handler = new MasterHandler();
    return handler.parse(stream, jsonPath, { mode: "stream" });
  }

  static findAsString( callback: (result, err?) => {}, stream: Readable, jsonPath: string = "$") {
    const handler = new MasterHandler();
    handler.parse(stream, jsonPath, { mode: "string" }, callback);
  }
}
