import { Readable, Stream } from "stream";
import { MasterHandler } from "./handler/mastehandler";

export class Piffero {
  static findPath(stream: Readable, jsonPath: string): Stream {
    const handler = new MasterHandler();
    return handler.parse(stream, jsonPath);
  }
}
