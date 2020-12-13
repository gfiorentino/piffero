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
  cStream: CStream;
  callback: (result) => void;
  stream: Readable;
  output: Duplex;

  parse(
    stream: Readable,
    jsonPath: string,
    opt: PifferoOpt,
    callback?: (result) => void
  ): Stream {
    this.callback = callback;
    this.stream = stream;
    this._opt = opt;
    let parsedPath = JSONPath.parse(jsonPath);

    this.output = new Stream.Transform();

    // ------ da ottimizzare ----
    let status = new PifferoStatus(parsedPath);
    const singleStepHandler = new SingleStepHandler(
      parsedPath,
      this.output,
      opt
    );

    this.stepHandlers.push(singleStepHandler);

    while (parsedPath.next) {
      parsedPath = parsedPath.next;
      status = new PifferoStatus(parsedPath);
      const singleStepHandler = new SingleStepHandler(
        parsedPath,
        this.output,
        opt
      );
      this.stepHandlers.push(singleStepHandler);
    }

    this.currentHandler = this.stepHandlers[this.handlerIndex];

    this.shiftParser();
    this.cStream = new CStream(this);
    this.stream.pipe(this.cStream);

    if (opt.mode === "stream") {
      return this.output;
    }
  }

  checkStreams() {
    if (this.currentHandler.status.end && this.currentHandler.isLast) {
      this.cStream.destroy();
      this.stream.unpipe();
      this.stream.destroy();
    }
  }

  shiftParser() {
    if (this.currentHandler.status.recording && !this.currentHandler.isLast) {
      let last = this.currentHandler.status.last;
      const lastkey = this.currentHandler.status.lastkey;
      let depthCounter = 0;
      if (this.currentHandler.status.last === "openobject") {
        depthCounter = 1;
        last = "first";
      }
      this.handlerIndex++;
      this.currentHandler = this.stepHandlers[this.handlerIndex];
      this.currentHandler.status.last = last;
      this.currentHandler.status.lastkey = lastkey;
      this.currentHandler.status.depthCounter = depthCounter;
    }
  }

  // --- OPEN OBJECT -----------------------------------------------------------
  onopenobject(node) {
    this.currentHandler.openObject(node);
    this.shiftParser();
    // checkStreams();
  }

  // ------ OPEN ARRAY -----------------------------------------------------------
  onopenarray() {
    this.currentHandler.openArray();
    this.shiftParser();
    // checkStreams();
  }

  // --- CLOSE OBJECT  -------------------------------------------------------
  oncloseobject() {
    this.currentHandler.closeObject();
    // shiftParser();
    this.checkStreams();
  }

  // --- CLOSE ARRAY  -------------------------------------------------------
  onclosearray() {
    this.currentHandler.closeArray();
    // shiftParser();
    this.checkStreams();
  }

  // ------ KEY  --------------------------------------------------------
  onkey(node) {
    this.currentHandler.key(node);
    this.shiftParser();
    this.checkStreams();
  }
  // ------ END KEY  --------------------------------------------------------

  //--- VALUE -----------------------------------------------------------
  onvalue(node) {
    this.currentHandler.value(node);
    // shiftParser();
    this.checkStreams();
  }

  //---END VALUE -----------------------------------------------------------
  endOutput() {
    this.currentHandler.status.close = true;
    if (this._opt.mode === "stream") {
      this.output.push(null);
    } else {
      this.callback(this.currentHandler.outputString);
    }
  }

  onend() {
    if (!this.currentHandler.status.close) {
      this.endOutput();
    }
  }

  onclose() {
    if (!this.currentHandler.status.close) {
      this.endOutput();
    }
  }

  onerror(er) {
    console.error("error", er);
  }
}
