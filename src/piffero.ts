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
  handlerIndex = 0;
  stepHandlers: SingleStepHandler[] = [];
  currentHandler: SingleStepHandler;


  parse(stream: Readable, jsonPath: string): Stream {
  
    const checkStreams = () => {
      if (this.currentHandler.status.end && this.currentHandler.isLast) {
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
      parsedPath = parsedPath.next;
      status = new PifferoStatus(parsedPath);
      const singleStepHandler = new SingleStepHandler(parsedPath, output);
      this.stepHandlers.push(singleStepHandler);
    }
    //---------------

    this.currentHandler = this.stepHandlers[this.handlerIndex];
    const cStream = (clarinet as any).createStream();
    

    const shiftParser = () => {
      if (this.currentHandler.status.recording && !this.currentHandler.isLast) {
        
        const last = this.currentHandler.status.last;
        const lastkey = this.currentHandler.status.lastkey;
        let depthCounter = 0;
        if(this.currentHandler.status.last === "openobject"){
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
      checkStreams();
    });

    // ------ OPEN ARRAY -----------------------------------------------------------
    cStream.on("openarray", () => {
      this.currentHandler.openArray();
      shiftParser();
      checkStreams();
    });

    // --- CLOSE OBJECT  -------------------------------------------------------
    cStream.on("closeobject", () => {
      this.currentHandler.closeObject();
      shiftParser();
      checkStreams();
    });

    // --- CLOSE ARRAY  -------------------------------------------------------
    cStream.on("closearray", () => {
      this.currentHandler.closeArray();
      shiftParser();
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
      shiftParser();
      checkStreams();
    });

    //---END VALUE -----------------------------------------------------------
    const endOutput = () => {
      this.currentHandler.status.close = true;
      output.push(null);
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
    return output;
  }
}

class SingleStepHandler {
  status: PifferoStatus;
  isLast = false;
  output: Duplex;
  constructor(path: ParsedPath, output: Duplex) {
    this.status = new PifferoStatus(path);
    this.output = output;
    this.isLast  = path.next == undefined || path.next == null;
  }
  openObject(node: any) {
    if (this.status.end) {
      return;
    }
    if (this.status.recording && this.status.verified && this.isLast) {
      if (
        this.status.depthCounter === 0 ||
        (this.status.isMatching && this.status.depthCounter === 1)
      ) {
        this.status.recording = false;
        this.status.verified = false;
        this.status.end = true;
      } else {
        if (this.status.needComma) {
          this.output.push(",");
        }
        this.output.push(`{"${node}":`);
      }
    }
    if (
      this.status.path.value === node &&
      this.status.depthCounter === 0
    ) {
      if (!this.status.isInArray) {
        this.status.recording = true;
        this.status.verified = true;
      } else {
        this.status.isMatching = true;
      }
    } else if (
      this.status.isMatching &&
      this.status.depthCounter === 2
    ) {
      this.status.currentIndex++;
      // se lavoriamo con un indice

      if (
        this.status.path.range &&
        this.status.currentIndex === this.status.path.range.start
      ) {
        if (this.isLast){
          this.output.push(`{"${node}":`);
        }
        this.status.recording = true;
        this.status.verified = true;
        this.status.decrementDepthConnter();
        // --------------- condition per json path query -------
      } else if (this.status.path.condition) {
        this.status.temp = `{"${node}":`;
      }
    } else if (
      this.status.isMatching &&
      this.status.depthCounter > 2
    ) {
      if (this.status.temp.length > 0) {
        if (this.status.needComma) {
          this.status.temp = this.status.temp + ",";
        }
        this.status.temp = this.status.temp + `{"${node}":`;
      }
    }
    // ----------
    this.status.incrementDepthConnter();
    this.status.lastkey = node;
    this.status.last = "openobject";
  }

  closeObject() {
    if (this.status.end) {
      return;
    }
    if (this.status.recording && this.status.verified && this.isLast) {
      if (this.status.depthCounter === 1) {
        this.status.recording = false;
        this.status.end = true;
      } else {
        this.output.push(`}`);
      }
    }
    //------ condition case ----------
    else if (
      this.status.isMatching &&
      this.status.depthCounter > 2
    ) {
      if (this.status.temp.length > 0) {
        if (this.status.needComma) {
          this.status.temp = this.status.temp + ",";
        }
        this.status.temp = this.status.temp + "}";
      }
    }
    // -------------
    this.status.decrementDepthConnter();
    this.status.last = "closeobject";
  }

  openArray() {
    if (this.status.end) {
      return;
    }
    if (this.status.recording && this.status.verified && this.isLast) {
      if (this.status.needComma) {
        this.output.push(",");
      }
      this.output.push("[");
    }
    // ------ condition case -------
    else if (
      this.status.isMatching &&
      this.status.depthCounter > 2
    ) {
      if (this.status.temp.length > 0) {
        if (this.status.needComma) {
          this.status.temp = this.status.temp + ",";
        }
        this.status.temp = this.status.temp + "[";
      }
    } else if (this.status.depthCounter === 3) {
      this.status.temp = "";
    }
    // ---------------
    this.status.incrementDepthConnter();
    this.status.last = "openarray";
  }

  closeArray() {
    if (this.status.end) {
      return;
    }
    if (this.status.recording && this.status.verified && this.isLast) {
      if (this.status.depthCounter === 1) {
        this.status.recording = false;
        this.status.end = true;
        if (!this.status.path.range) {
          this.output.push(`]`);
        }
      } else {
        this.output.push(`]`);
      }
    } //------ condition case close array----------
    else if (
      this.status.isMatching &&
      this.status.depthCounter > 3
    ) {
      if (this.status.temp.length > 0) {
        if (this.status.needComma) {
          this.status.temp = this.status.temp + ",";
        }
        this.status.temp = this.status.temp + "]";
      }
    }
    this.status.decrementDepthConnter();
    this.status.last = "closearray";
  }

  key(node: any) {
    if (this.status.end) {
      return;
    }
    if (this.status.depthCounter === 1 && this.status.recording && this.isLast) {
      this.status.recording = false;
      this.status.end = true;
    }
    if (this.status.recording && this.status.verified && this.isLast) {
      if (this.status.needComma) {
        this.output.push(",");
      }
      this.output.push(`"${node}":`);
    }
    if (
      this.status.depthCounter === 1 &&
      this.status.path.value === node
    ) {
      if (!this.status.isInArray) {
        this.status.recording = true;
        this.status.verified = true;
      } else {
        this.status.isMatching = true;
      }
    }//------ condition case key---------- 
    else if (this.status.isMatching && this.status.depthCounter > 2) {
      if (this.status.temp.length > 0) {
        if (this.status.needComma) {
          this.status.temp = this.status.temp + ',';
        }
        this.status.temp = this.status.temp + `"${node}":`;
      }
    }

    this.status.lastkey = node;
    this.status.last = "key";

  }
  value(node: any) {
    if (
      this.status.last === "openarray" &&
      this.status.depthCounter === 2
    ) {
      this.status.isPrimitiveTypeArray = true;
    }
    if (
      this.status.isInArray &&
      this.status.isMatching &&
      this.status.isPrimitiveTypeArray &&
      this.status.depthCounter === 2
    ) {
      this.status.currentIndex++;
      if (this.status.currentIndex === this.status.path.range.start) {
        this.output.push(JSON.stringify(node));
        this.status.recording = false;
        this.status.end = true;
      }
    }
    if (this.status.recording && this.status.verified && this.isLast) {
      if (this.status.needComma) {
        this.output.push(",");
      }
      this.output.push(JSON.stringify(node));

      if (this.status.depthCounter === 1) {
        this.status.recording = false;
        this.status.end = true;
      }
      ///-----condition value -----
    } else if(this.verifyCondition(JSON.stringify(node))){
      this.status.recording = true;
      this.status.verified = true;
      this.status.decrementDepthConnter();
      this.output.push(this.status.temp);
      if (this.status.needComma) {
        this.output.push(",");
      }
      this.output.push(JSON.stringify(node));
      this.status.temp='';
    } else if ( this.status.isMatching &&  this.status.depthCounter > 2) {
      if ( this.status.temp.length > 0) {
        if ( this.status.needComma) {
          this.status.temp =  this.status.temp + ',';
        }
        this.status.temp =  this.status.temp + (JSON.stringify(node));
      }
    }
    this.status.last = "value";
  }

  verifyCondition  (value):boolean {
    const condition = this.status.path.condition ;
    return condition 
    && this.status.depthCounter === 3
    && this.status.isMatching 
    && condition.key === this.status.lastkey 
    && ( this.status.last === 'key' || this.status.last === 'openobject' ) 
    && condition.value === value;
  }
}
