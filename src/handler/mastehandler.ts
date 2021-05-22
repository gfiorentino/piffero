import { CStream } from "./../libs/clarinet/cstream";
import { Duplex, Readable, Stream } from "stream";
import { ParsedPath } from "../jsonpath";

export type PifferoOpt = "string" | "stream";

const OPEN_OBJECT = "object-open";
const CLOSE_OBJECT = "object-close";
const OPEN_ARRAY = "array-open";
const CLOSE_ARRAY = "array-close";
const VALUE = "value";
const KEY = "key";
const FIRST = "first";
export const PATH_ERROR_MESSAGE = "Invalid json path";
export const PATH_DOESNT_MATCH = "Path doesn't match";
export class PifferoError extends Error {}

export class PifferoJsonPathError extends Error {}

type PifferoEvent =
  | typeof OPEN_OBJECT
  | typeof CLOSE_OBJECT
  | typeof OPEN_ARRAY
  | typeof CLOSE_ARRAY
  | typeof VALUE
  | typeof KEY
  | typeof FIRST;

export class PifferoStatus {
  //abbiamo verificato la condizione
  verified: boolean = false;
  // sto "registrando"
  recording: boolean = false;

  //sono in un array e cerco
  isInArray: boolean = false;
  // forse non serve arraay di primitivi
  isPrimitiveTypeArray = false;
  // la root è un array
  isRootArray = false;

  isMatching = false;

  waitingForArrayClosing = false;

  _needComma = false;

  _isBulkResponse = false;

  temp = "";

  end: boolean = false;
  close: boolean = false;

  // conta a che livello sono sceso per aggiornare gli indici
  public depthCounter: number = 0;
  public needBracketes: boolean = false;
  currentIndex: number = -1;

  public last: PifferoEvent;

  lastkey: string;

  path: ParsedPath = undefined;

  constructor(path: ParsedPath, isBulk: boolean = false) {
    this.path = path;
    this._isBulkResponse = isBulk;
    if (this.path.range || path.condition) {
      this.isInArray = true;
      if (this.path.value === '"$"') {
        this.depthCounter = 1;
        this.isMatching = true;
      }
    } else if (this.path.value === '"$"') {
      if (!path.condition) {
        this.verified = true;
      }
      this.recording = true;
    }

    if (this.path.value !== '"$"') {
      this.last = FIRST;
    }
  }

  get needComma(): boolean {
    return (
      this.last === CLOSE_ARRAY ||
      this.last === CLOSE_OBJECT ||
      this.last === VALUE ||
      this._needComma
    );
  }
  get isBulkResponse(): boolean {
    return this._isBulkResponse || this.path.isbulk || this.path.hascondtion;
  }

  checkIndex() {
    if (this.path.indexes && this.path.indexes.length > 0) {
      return this.path.indexes.indexOf(this.currentIndex) >= 0;
    }
    const range = this.path.range;
    let start = 0;
    let end = this.currentIndex + 1;
    let step = 1;

    if (range.start >= 0) {
      start = range.start;
    }
    if (this.currentIndex < start) {
      return false;
    }
    if (range.end > 0) {
      end = range.end;
    }
    if (this.currentIndex > end) {
      return false;
    }
    if (range.step > 0) {
      step = range.step;
    }
    return Number.isInteger((this.currentIndex - start) / step);
  }
}

export class MasterHandler {
  handlerIndex = 0;
  stepHandlers: SingleStepHandler[] = [];
  currentHandler: SingleStepHandler;
  useString: boolean;
  cStream: CStream;
  callback: (result, error?) => void;
  error = null;
  stream: Readable;
  output: Duplex;

  parse(
    stream: Stream,
    parsedPath: ParsedPath,
    useString = false,
    callback?: (result, error?) => void,
    isBulk: boolean = false
  ): Stream {
    this.callback = callback;
    this.stream = stream as Readable;
    this.useString = useString;
    this.output = new Stream.Transform();

    // ------ da ottimizzare ----
    //let status = new PifferoStatus(parsedPath);
    const singleStepHandler = new SingleStepHandler(
      parsedPath,
      this.output,
      useString
      // opt
    );

    this.stepHandlers.push(singleStepHandler);

    while (parsedPath.next && !parsedPath.hascondtion) {
      parsedPath = parsedPath.next;
      //  status = new PifferoStatus(parsedPath,isBulk);
      const singleStepHandler = new SingleStepHandler(
        parsedPath,
        this.output,
        useString,
        isBulk
      );
      this.stepHandlers.push(singleStepHandler);
    }

    let output2: Stream = undefined;

    // recursive if has condition ... no better solution for now :(
    if (parsedPath.next) {
      const nexthandler: MasterHandler = new MasterHandler();
      output2 = new Stream.Transform();
      const nextParsedPath: ParsedPath = {
        value: '"$"',
        next: parsedPath.next,
        indexes: [],
        isbulk: true,
        hascondtion: false,
        recursiveDescendant: false,
      };
      // const opt2 = this._opt;
      this.useString = false;
      output2 = nexthandler.parse(
        this.output as Stream,
        nextParsedPath,
        useString,
        callback,
        true
      );
      this.callback = (result, error) => {};
    } else {
      this.output.push("[");
    }

    this.currentHandler = this.stepHandlers[this.handlerIndex];

    this.shiftParser();
    this.cStream = new CStream(this);
    this.stream.pipe(this.cStream);
    if (!useString) {
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
    if (!this.currentHandler.isLast && this.currentHandler.status.recording) {
      let last = this.currentHandler.status.last;
      const lastkey = this.currentHandler.status.lastkey;
      let depthCounter = 0;
      if (this.currentHandler.status.last === OPEN_OBJECT) {
        depthCounter = 1;
        last = FIRST;
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
    if (!this.useString) {
      this.output.push("]");
      this.output.push(null);
    } else {
      this.currentHandler.outputString += "]";
      this.callback(this.currentHandler.outputString, this.error);
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
    this.error = new PifferoError(er);
    if (!this.useString) {
      throw new PifferoError(this.error);
    }
  }
}

class SingleStepHandler {
  status: PifferoStatus;
  isLast = false;
  _output: Duplex;
  useString = false;
  outputString = "[";
  push: (value) => void;

  constructor(
    path: ParsedPath,
    output: Duplex,
    useString,
    isBulk: boolean = false
  ) {
    this.useString = useString;
    this.status = new PifferoStatus(path, isBulk);
    this._output = output;
    this.isLast =
      path.next == undefined || path.next == null || path.hascondtion;
    if (this.isLast) {
      if (this.useString) {
        this.push = (value) => (this.outputString += value);
      } else {
        this.push = (value) => this._output.push(value);
      }
    }
  }

  stopHandler(force = false) {
    const status = this.status;
    status.verified = false;
    if (!status.isBulkResponse || force) {
      status.recording = false;
      status.end = true; // temporaneo
    } else {
      status.waitingForArrayClosing = true;
    }
  }

  openObject(node: any) {
    const status = this.status;
    if (status.end) {
      return;
    }
    if (status.recording && status.verified && this.isLast) {
      const string = node === undefined ? "{" : `{${node}:`;
      if (
        status.depthCounter === 0 ||
        (status.isMatching && status.depthCounter === 1)
      ) {
        this.stopHandler();
        status.temp = `,${string}`;
        status.depthCounter++;
      } else {
        if (status.needComma) {
          this.push(`,${string}`);
        } else {
          this.push(`${string}`);
        }
      }
    } else if (status.path.value === node && status.depthCounter === 0) {
      if (!status.isInArray) {
        status.recording = true;
        status.verified = true;
      } else {
        status.isMatching = true;
      }
    } else if (status.isMatching && status.depthCounter === 2) {
      status.currentIndex++;
      // se lavoriamo con un indice
      if (status.path.isbulk && status.checkIndex()) {
        if (this.isLast) {
          this.push(`{${node}:`);
        }
        status.recording = true;
        status.verified = true;
        status.depthCounter--;
        // --------------- condition per json path query -------
      }
      if (status.path.condition) {
        status.temp = `{${node}:`;
      }
    } else if (status.isMatching && status.depthCounter > 2) {
      if (status.temp.length > 0) {
        if (status.needComma) {
          status.temp += `,{${node}:`;
        } else {
          status.temp += `{${node}:`;
        }
      }
    }
    // ----------

    if (status.last !== FIRST) {
      status.depthCounter++;
    }

    status.lastkey = node;
    status.last = OPEN_OBJECT;
  }

  closeObject() {
    const status = this.status;
    if (status.end) {
      return;
    }
    if (status.recording && status.verified && this.isLast) {
      if (status.depthCounter === 1) {
        this.stopHandler();
      } else {
        this.push(`}`);
      }
    }
    //------ condition case ----------
    else if (status.isMatching && status.depthCounter > 2) {
      if (status.temp.length > 0) {
        if (status.needComma) {
          status.temp += ",";
        }
        status.temp += "}";
      }
    }
    // -------------
    status.depthCounter--;
    status.last = CLOSE_OBJECT;
  }

  openArray() {
    const status = this.status;
    if (status.end) {
      return;
    }
    if (status.recording && status.verified && this.isLast) {
      if (
        (status.depthCounter === 0 ||
          (status.isMatching && status.depthCounter === 1)) &&
        status.path.value !== '"$"' // accrocco;
      ) {
        this.stopHandler();
      } else {
        if (status.needComma) {
          this.push(",[");
        } else {
          this.push("[");
        }
      }
    }
    // ------ condition case -------
    else if (status.isMatching && status.depthCounter > 2) {
      if (status.temp.length > 0) {
        if (status.needComma) {
          status.temp += ",";
        }
        status.temp += "[";
      }
    } else if (status.depthCounter === 3) {
      status.temp = "";
    } else if (status.isMatching && status.depthCounter === 2) {
      status.currentIndex++;
      if (status.path.isbulk && status.checkIndex()) {
        if (this.isLast) {
          this.push(`[`);
        }
        status.recording = true;
        status.verified = true;
        status.depthCounter--; // da verificare
        // --------------- condition per json path query -------
      } else if (status.path.condition) {
        status.temp = `[`;
      }
    }
    // ---------------
    status.depthCounter++;
    status.last = OPEN_ARRAY;
  }

  closeArray() {
    const status = this.status;
    if (status.end) {
      return;
    }
    if (status.recording && status.verified && this.isLast) {
      if (status.depthCounter === 1) {
        this.stopHandler();
        status._needComma = true;
        if (!status.path.isbulk && !status.path.hascondtion) {
          this.push(`]`);
        }
      } else {
        this.push(`]`);
      }
    } else if (status.waitingForArrayClosing && status.depthCounter === 2) {
      this.stopHandler(true);
    }
    //------ condition case close array----------
    else if (status.isMatching && status.depthCounter > 3) {
      if (status.temp.length > 0) {
        if (status.needComma) {
          status.temp += ",";
        }
        status.temp += "]";
      }
    }
    status.depthCounter--;
    //  if (status.depthCounter < 3) {
    // status.currentIndex=0;
    // }
    status.last = CLOSE_ARRAY;
  }

  key(node: any) {
    const status = this.status;
    if (status.end) {
      return;
    }
    if (status.depthCounter === 1 && status.recording && this.isLast) {
      this.stopHandler();
    }
    if (status.recording && status.verified && this.isLast) {
      if (status.needComma) {
        this.push(`,${node}:`);
      } else {
        this.push(`${node}:`);
      }
    } else if (status.depthCounter === 1 && status.path.value === node) {
      if (!status.isInArray) {
        status.recording = true;
        status.verified = true;
      } else {
        status.isMatching = true;
      }
    } //------ condition case key----------
    else if (status.isMatching && status.depthCounter > 2) {
      if (status.temp.length > 0) {
        if (status.needComma) {
          status.temp += ",";
        }
        status.temp += `${node}:`;
      }
    }
    status.lastkey = node;
    status.last = KEY;
  }

  value(node: any) {
    const status = this.status;
    if (status.last === OPEN_ARRAY && status.depthCounter === 2) {
      status.isPrimitiveTypeArray = true;
    }
    if (
      status.isInArray &&
      status.isMatching &&
      status.isPrimitiveTypeArray &&
      status.depthCounter === 2
    ) {
      status.currentIndex++;
      if (status.checkIndex() && !status.close) {
        //  console.log(status.path.range, status.currentIndex);
        if (status.currentIndex > status.path.range.start) {
          this.push(`,${node}`);
        } else {
          this.push(`${node}`);
        }
        this.stopHandler();
        status._needComma = true;
      }
    }
    if (status.recording && status.verified && this.isLast) {
      if (status.needComma) {
        this.push(`,${node}`);
      } else {
        this.push(`${node}`);
      }
      if (status.depthCounter === 1) {
        this.stopHandler();
        status._needComma = true;
      }
      ///-----condition value -----
    } else if (status.path.hascondtion && this.verifyCondition(node)) {
      status.recording = true;
      status.verified = true;
      status.depthCounter--;
      this.push(status.temp);
      if (status.needComma) {
        this.push(`,${node}`);
      } else {
        this.push(node);
      }
      status.temp = "";
    } else if (status.isMatching && status.depthCounter > 2) {
      if (status.temp.length > 0) {
        if (status.needComma) {
          status.temp += ",";
        }
        status.temp += node;
      }
    }
    status.last = VALUE;
  }

  verifyCondition(value): boolean {
    const status = this.status;
    const condition = status.path.condition;
    return (
      status.isMatching &&
      status.depthCounter === 3 &&
      condition.key === status.lastkey &&
      (status.last === KEY || status.last === OPEN_OBJECT) &&
      condition.value === value
    );
  }
}
