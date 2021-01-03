import { CStream } from "./../libs/clarinet/cstream";
import { SingleStepHandler } from "./singlestephandler";
import { ParsedPath } from "../jsonpath";
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
    stream: Stream,
    parsedPath: ParsedPath,
    opt: PifferoOpt,
    callback?: (result) => void
  ): Stream {
    this.callback = callback;
    this.stream = stream as Readable;
    this._opt = opt;
    //  let parsedPath = JSONPath.parse(jsonPath);

    this.output = new Stream.Transform();

    // ------ da ottimizzare ----
    let status = new PifferoStatus(parsedPath);
    const singleStepHandler = new SingleStepHandler(
      parsedPath,
      this.output,
      opt
    );

    this.stepHandlers.push(singleStepHandler);

    while (parsedPath.next && !parsedPath.hascondtion) {
      parsedPath = parsedPath.next;
      status = new PifferoStatus(parsedPath);
      const singleStepHandler = new SingleStepHandler(
        parsedPath,
        this.output,
        opt
      );
      this.stepHandlers.push(singleStepHandler);
    }

    let output2: Stream = undefined;

    // recursive if has condition ... no better solution for now
    if (parsedPath.next) {
      const nexthandler: MasterHandler = new MasterHandler();
      output2 = new Stream.Transform();
      const nextParsedPath: ParsedPath = {
        value: '"$"',
        next: parsedPath.next,
        hascondtion: false,
        recursiveDescendant: false,
      };
      const opt2 = { ...this._opt };
      this._opt.mode = "stream";
      output2 = nexthandler.parse(
        this.output as Stream,
        nextParsedPath,
        opt2,
        callback
      );
      this.callback = (result) => {};
    } else {
      this.output.push('[');
    }

    this.currentHandler = this.stepHandlers[this.handlerIndex];

    this.shiftParser();
    this.cStream = new CStream(this);
    this.stream.pipe(this.cStream);

    if (opt.mode === "stream") {
      if (output2) {
        return output2;
      }
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
    if (!this.currentHandler.isLast && this.currentHandler.status.recording ) {
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
  }

  // ------ OPEN ARRAY -----------------------------------------------------------
  onopenarray() {
    this.currentHandler.openArray();
    this.shiftParser();
  }

  // --- CLOSE OBJECT  -------------------------------------------------------
  oncloseobject() {
    this.currentHandler.closeObject();
    this.checkStreams();
  }

  // --- CLOSE ARRAY  -------------------------------------------------------
  onclosearray() {
    this.currentHandler.closeArray();
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
    this.checkStreams();
  }

  //---END VALUE -----------------------------------------------------------
  endOutput() {
    this.currentHandler.status.close = true;
    if (this._opt.mode === "stream") {
      this.output.push(']');
      this.output.push(null);
    } else {
      this.currentHandler.outputString += "]"; 
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
