import * as clarinet from "./libs/clarinet";
import { JSONPath, ParsedPath } from "./jsonpath";
import { Duplex, Readable, Stream } from "stream";
import { PifferoStatus } from "./pifferostatus2";

export class Piffero {
  static findPath(stream: Readable, jsonPath: string): Stream {
    const handler = new MasterHandler();
    return handler.parse(stream, jsonPath);
  }
}

class MasterHandler {
  isLast = false;
  handlerIndex = 0;
  stepHandlers: SingleStepHandler[];
  currentHandler: SingleStepHandler;


  parse(stream: Readable, jsonPath: string): Stream {
  
    const checkStreams = () => {
      if (this.currentHandler.pifferoStatus.end && this.isLast) {
        cStream.destroy();
        stream.unpipe();
        stream.destroy();
      }
    };

    let parsedPath = JSONPath.parse(jsonPath);

    const output: Duplex = new Stream.Transform();

    // ------da ottimizzare
    let status = new PifferoStatus(parsedPath);
    const singleStepHandler = new SingleStepHandler(parsedPath, output);
    this.stepHandlers.push(singleStepHandler);
    while (parsedPath.next) {
       status = new PifferoStatus(parsedPath.next);
      const singleStepHandler = new SingleStepHandler(parsedPath.next, output);
      this.stepHandlers.push(singleStepHandler);
    }
    //---------------

    this.currentHandler = this.stepHandlers[this.handlerIndex];
    const cStream = (clarinet as any).createStream();

    const shiftParser = () => {
      if (this.stepHandlers[this.handlerIndex].recording && !this.isLast) {
        this.handlerIndex++;
        this.isLast = this.handlerIndex == this.stepHandlers.length - 1;
      }
    };

    // --- OPEN OBJECT -----------------------------------------------------------
    cStream.on("openobject", (node) => {
      this.currentHandler.openObject(node);
      shiftParser();
    });

    // ------ OPEN ARRAY -----------------------------------------------------------
    cStream.on("openarray", () => {
      this.currentHandler.openArray();
      shiftParser();
    });

    // --- CLOSE OBJECT  -------------------------------------------------------
    cStream.on("closeobject", () => {
      this.currentHandler.closeObject();
      shiftParser();
    });

    // --- CLOSE ARRAY  -------------------------------------------------------
    cStream.on("closearray", () => {});

    // ------ KEY  --------------------------------------------------------
    cStream.on("key", (node) => {
      this.currentHandler.key(node);
      shiftParser();
    });
    // ------ END KEY  --------------------------------------------------------

    //--- VALUE -----------------------------------------------------------
    cStream.on("value", (node) => {
      this.currentHandler.key(node);
      shiftParser();
    });

    //---END VALUE -----------------------------------------------------------
    const endOutput = () => {
      output.push(null);
    };

    cStream.on("end", () => {
      if (!this.currentHandler.pifferoStatus.close) {
        endOutput();
      }
    });

    cStream.on("close", () => {
      if (!this.currentHandler.pifferoStatus.close) {
        endOutput();
      }
    });

    return output;
  }
}

class SingleStepHandler {
  pifferoStatus: PifferoStatus;
  recording = false;
  isLast = false;
  output: Duplex;
  constructor(path: ParsedPath, output: Duplex) {
    this.pifferoStatus = new PifferoStatus(path);
    this.output = output;
    this.isLast  = path.next == undefined || path.next == null;
  }
  openObject(node: any) {
    if (this.pifferoStatus.end) {
      return;
    }
    if (this.pifferoStatus.recording && this.pifferoStatus.verified) {
      if (
        this.pifferoStatus.depthCounter === 0 ||
        (this.pifferoStatus.isMatching && this.pifferoStatus.depthCounter === 1)
      ) {
        this.pifferoStatus.recording = false;
        this.pifferoStatus.verified = false;
        this.pifferoStatus.end = true;
      } else {
        if (this.pifferoStatus.needComma) {
          this.output.push(",");
        }
        this.output.push(`{"${node}":`);
      }
    }
    if (
      this.pifferoStatus.path.value === node &&
      this.pifferoStatus.depthCounter === 0
    ) {
      if (!this.pifferoStatus.isInArray) {
        this.pifferoStatus.recording = true;
        this.pifferoStatus.verified = true;
      } else {
        this.pifferoStatus.isMatching = true;
      }
    } else if (
      this.pifferoStatus.isMatching &&
      this.pifferoStatus.depthCounter === 2
    ) {
      this.pifferoStatus.currentIndex++;
      // se lavoriamo con un indice

      if (
        this.pifferoStatus.path.range &&
        this.pifferoStatus.currentIndex === this.pifferoStatus.path.range.start
      ) {
        this.output.push(`{"${node}":`);
        this.pifferoStatus.recording = true;
        this.pifferoStatus.verified = true;
        this.pifferoStatus.decrementDepthConnter();
        // --------------- condition per json path query -------
      } else if (this.pifferoStatus.path.condition) {
        this.pifferoStatus.temp = `{"${node}":`;
      }
    } else if (
      this.pifferoStatus.isMatching &&
      this.pifferoStatus.depthCounter > 2
    ) {
      if (this.pifferoStatus.temp.length > 0) {
        if (this.pifferoStatus.needComma) {
          this.pifferoStatus.temp = this.pifferoStatus.temp + ",";
        }
        this.pifferoStatus.temp = this.pifferoStatus.temp + `{"${node}":`;
      }
    }
    // ----------
    this.pifferoStatus.incrementDepthConnter();
    this.pifferoStatus.lastkey = node;
    this.pifferoStatus.last = "openobject";
  }

  closeObject() {
    if (this.pifferoStatus.end) {
      return;
    }
    if (this.pifferoStatus.recording && this.pifferoStatus.verified) {
      if (this.pifferoStatus.depthCounter === 1) {
        this.pifferoStatus.recording = false;
        this.pifferoStatus.end = true;
      } else {
        this.output.push(`}`);
      }
    }
    //------ condition case ----------
    else if (
      this.pifferoStatus.isMatching &&
      this.pifferoStatus.depthCounter > 2
    ) {
      if (this.pifferoStatus.temp.length > 0) {
        if (this.pifferoStatus.needComma) {
          this.pifferoStatus.temp = this.pifferoStatus.temp + ",";
        }
        this.pifferoStatus.temp = this.pifferoStatus.temp + "}";
      }
    }
    // -------------
    this.pifferoStatus.decrementDepthConnter();
    this.pifferoStatus.last = "closeobject";
  }

  openArray() {
    if (this.pifferoStatus.end) {
      return;
    }
    if (this.pifferoStatus.recording && this.pifferoStatus.verified) {
      if (this.pifferoStatus.needComma) {
        this.output.push(",");
      }
      this.output.push("[");
    }
    // ------ condition case -------
    else if (
      this.pifferoStatus.isMatching &&
      this.pifferoStatus.depthCounter > 2
    ) {
      if (this.pifferoStatus.temp.length > 0) {
        if (this.pifferoStatus.needComma) {
          this.pifferoStatus.temp = this.pifferoStatus.temp + ",";
        }
        this.pifferoStatus.temp = this.pifferoStatus.temp + "[";
      }
    } else if (this.pifferoStatus.depthCounter === 3) {
      this.pifferoStatus.temp = "";
    }
    // ---------------
    this.pifferoStatus.incrementDepthConnter();
    this.pifferoStatus.last = "openarray";
  }

  closeArray() {
    if (this.pifferoStatus.end) {
      return;
    }
    if (this.pifferoStatus.recording && this.pifferoStatus.verified) {
      if (this.pifferoStatus.depthCounter === 1) {
        this.pifferoStatus.recording = false;
        this.pifferoStatus.end = true;
        if (!this.pifferoStatus.path.range) {
          this.output.push(`]`);
        }
      } else {
        this.output.push(`]`);
      }
    } //------ condition case close array----------
    else if (
      this.pifferoStatus.isMatching &&
      this.pifferoStatus.depthCounter > 3
    ) {
      if (this.pifferoStatus.temp.length > 0) {
        if (this.pifferoStatus.needComma) {
          this.pifferoStatus.temp = this.pifferoStatus.temp + ",";
        }
        this.pifferoStatus.temp = this.pifferoStatus.temp + "]";
      }
    }
    this.pifferoStatus.decrementDepthConnter();
    this.pifferoStatus.last = "closearray";
  }

  key(node: any) {
    if (this.pifferoStatus.end) {
      return;
    }
    if (this.pifferoStatus.depthCounter === 1 && this.pifferoStatus.recording) {
      this.pifferoStatus.recording = false;
      this.pifferoStatus.end = true;
    }
    if (this.pifferoStatus.recording && this.pifferoStatus.verified) {
      if (this.pifferoStatus.needComma) {
        this.output.push(",");
      }
      this.output.push(`"${node}":`);
    }
    if (
      this.pifferoStatus.depthCounter === 1 &&
      this.pifferoStatus.path.value === node
    ) {
      if (!this.pifferoStatus.isInArray) {
        this.pifferoStatus.recording = true;
        this.pifferoStatus.verified = true;
      } else {
        this.pifferoStatus.isMatching = true;
      }
    }//------ condition case key---------- 
    else if (this.pifferoStatus.isMatching && this.pifferoStatus.depthCounter > 2) {
      if (this.pifferoStatus.temp.length > 0) {
        if (this.pifferoStatus.needComma) {
          this.pifferoStatus.temp = this.pifferoStatus.temp + ',';
        }
        this.pifferoStatus.temp = this.pifferoStatus.temp + `"${node}":`;
      }
    }

    this.pifferoStatus.lastkey = node;
    this.pifferoStatus.last = "key";

  }
  value(node: any) {
    if (
      this.pifferoStatus.last === "openarray" &&
      this.pifferoStatus.depthCounter === 2
    ) {
      this.pifferoStatus.isPrimitiveTypeArray = true;
    }
    if (
      this.pifferoStatus.isInArray &&
      this.pifferoStatus.isMatching &&
      this.pifferoStatus.isPrimitiveTypeArray &&
      this.pifferoStatus.depthCounter === 2
    ) {
      this.pifferoStatus.currentIndex++;
      if (this.pifferoStatus.currentIndex === this.pifferoStatus.path.range.start) {
        this.output.push(JSON.stringify(node));
        this.pifferoStatus.recording = false;
        this.pifferoStatus.end = true;
      }
    }
    if (this.pifferoStatus.recording && this.pifferoStatus.verified) {
      if (this.pifferoStatus.needComma) {
        this.output.push(",");
      }
      this.output.push(JSON.stringify(node));

      if (this.pifferoStatus.depthCounter === 1) {
        this.pifferoStatus.recording = false;
        this.pifferoStatus.end = true;
      }
      ///-----condition value -----
    } else if(this.verifyCondition(JSON.stringify(node))){
      this.pifferoStatus.recording = true;
      this.pifferoStatus.verified = true;
      this.pifferoStatus.decrementDepthConnter();
      this.output.push(this.pifferoStatus.temp);
      if (this.pifferoStatus.needComma) {
        this.output.push(",");
      }
      this.output.push(JSON.stringify(node));
      this.pifferoStatus.temp='';
    } else if ( this.pifferoStatus.isMatching &&  this.pifferoStatus.depthCounter > 2) {
      if ( this.pifferoStatus.temp.length > 0) {
        if ( this.pifferoStatus.needComma) {
          this.pifferoStatus.temp =  this.pifferoStatus.temp + ',';
        }
        this.pifferoStatus.temp =  this.pifferoStatus.temp + (JSON.stringify(node));
      }
    }
    this.pifferoStatus.last = "value";
  }

  verifyCondition  (value):boolean {
    const condition = this.pifferoStatus.path.condition ;
    return condition 
    && this.pifferoStatus.depthCounter === 3
    && this.pifferoStatus.isMatching 
    && condition.key === this.pifferoStatus.lastkey 
    && ( this.pifferoStatus.last === 'key' || this.pifferoStatus.last === 'openobject' ) 
    && condition.value === value;
  }
}
