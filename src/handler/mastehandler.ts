import { CStream } from "./../libs/clarinet/cstream";
import { SingleStepHandler } from "./singlestephandler";
import { JSONPath } from "../jsonpath";
import { Duplex, Readable, Stream } from "stream";
import { PifferoOpt, PifferoStatus } from "../pifferostatus";

export class MasterHandler {
  handlerIndex = 0;
  stepHandlers: SingleStepHandler[] = [];
  currentHandler: SingleStepHandler;
  _opt: PifferoOpt;

  parse(
    stream: Readable,
    jsonPath: string,
    opt: PifferoOpt,
    callback?: (result) => {}
  ): Stream {
    this._opt = opt;
    let parsedPath = JSONPath.parse(jsonPath);

    const output: Duplex = new Stream.Transform();

    // ------ da ottimizzare
    let status = new PifferoStatus(parsedPath);
    const singleStepHandler = new SingleStepHandler(parsedPath, output, opt);
    this.stepHandlers.push(singleStepHandler);
    while (parsedPath.next) {
      parsedPath = parsedPath.next;
      status = new PifferoStatus(parsedPath);
      const singleStepHandler = new SingleStepHandler(parsedPath, output, opt);
      this.stepHandlers.push(singleStepHandler);
    }
    //---------------

    this.currentHandler = this.stepHandlers[this.handlerIndex];
    const cStream = new CStream() as any;

    const checkStreams = () => {
      if (this.currentHandler.status.end && this.currentHandler.isLast) {
        cStream.destroy();
        stream.unpipe();
        stream.destroy();
      }
    };

    const shiftParser = () => {
      if (this.currentHandler.status.recording && !this.currentHandler.isLast) {
        const last = this.currentHandler.status.last;
        const lastkey = this.currentHandler.status.lastkey;
        let depthCounter = 0;
        if (this.currentHandler.status.last === "openobject") {
          depthCounter = 1;
        }
        this.handlerIndex++;
        this.currentHandler = this.stepHandlers[this.handlerIndex];
        this.currentHandler.status.last = last;
        this.currentHandler.status.lastkey = lastkey;
        this.currentHandler.status.depthCounter = depthCounter;
      }
    };

    shiftParser();

    // --- OPEN OBJECT -----------------------------------------------------------
    cStream.on("openobject", (node) => {
      this.currentHandler.openObject(node);
      shiftParser();
      // checkStreams();
    });

    // ------ OPEN ARRAY -----------------------------------------------------------
    cStream.on("openarray", () => {
      this.currentHandler.openArray();
      shiftParser();
      // checkStreams();
    });

    // --- CLOSE OBJECT  -------------------------------------------------------
    cStream.on("closeobject", () => {
      this.currentHandler.closeObject();
      // shiftParser();
      checkStreams();
    });

    // --- CLOSE ARRAY  -------------------------------------------------------
    cStream.on("closearray", () => {
      this.currentHandler.closeArray();
      // shiftParser();
      checkStreams();
    });

    // ------ KEY  --------------------------------------------------------
    cStream.on("key", (node) => {
      this.currentHandler.key(node);
      shiftParser();
      checkStreams();
    });
    // ------ END KEY  --------------------------------------------------------

    //--- VALUE -----------------------------------------------------------
    cStream.on("value", (node) => {
      this.currentHandler.value(node);
      // shiftParser();
      checkStreams();
    });

    //---END VALUE -----------------------------------------------------------
    const endOutput = () => {
      this.currentHandler.status.close = true;
      if (opt.mode === "stream") {
        output.push(null);
      } else {
        callback(this.currentHandler.outputString);
      }
    };

    cStream.on("end", () => {
      if (!this.currentHandler.status.close) {
        endOutput();
      }
    });

    cStream.on("close", () => {
      if (!this.currentHandler.status.close) {
        endOutput();
      }
    });
    stream.pipe(cStream);

    if (opt.mode === "stream") {
      return output;
    }
  }
}
