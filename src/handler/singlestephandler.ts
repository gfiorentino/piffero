import { ParsedPath } from "../jsonpath";
import { Duplex } from "stream";
import {
  CLOSE_ARRAY,
  CLOSE_OBJECT,
  FIRST,
  KEY,
  OPEN_ARRAY,
  OPEN_OBJECT,
  PifferoStatus,
  VALUE,
} from "../pifferostatus";

export class SingleStepHandler {
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
      if (
        status.depthCounter === 0 ||
        (status.isMatching && status.depthCounter === 1)
      ) {
        this.stopHandler();
        status.temp = `,{${node}:`;
        status.depthCounter++;
      } else {
        if (status.needComma) {
          this.push(`,{${node}:`);
        } else {
          this.push(`{${node}:`);
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
      if (status.path.range && status.checkIndex()) {
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
      if (status.path.range && status.checkIndex()) {
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
    if (status.end ) {
      return;
    }
    if (status.recording && status.verified && this.isLast) {
      if (status.depthCounter === 1) {
        this.stopHandler();
        status._needComma = true;
        if (!status.path.range && !status.path.hascondtion) {
          this.push(`]`);
        }
      } else {
        this.push(`]`);
      }
    } else if( status.waitingForArrayClosing  && status.depthCounter === 2){
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
    if (status.recording && status.verified&& this.isLast) {
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
