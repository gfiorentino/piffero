import { ParsedPath } from "../jsonpath";
import { Duplex } from "stream";
import { CLOSE_ARRAY, CLOSE_OBJECT, FIRST, KEY, OPEN_ARRAY, OPEN_OBJECT, PifferoStatus, VALUE } from "../pifferostatus";

export class SingleStepHandler {
  status: PifferoStatus;
  isLast = false;
  _output: Duplex;
  useString = false;
  outputString = "[";
  push: (value) => {};

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

  stopHandler() {
    this.status.verified = false;
    if (!this.status.isBulkResponse) {
      this.status.recording = false;
      this.status.end = true; // temporaneo
    }
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
        this.stopHandler();
        this.status.temp = `,{${node}:`;
        this.status.depthCounter++;
      } else {
        if (this.status.needComma) {
          this.push(`,{${node}:`);
        } else {
          this.push(`{${node}:`);
        }
      }
    } else if (
      this.status.path.value === node &&
      this.status.depthCounter === 0
    ) {
      if (!this.status.isInArray) {
        this.status.recording = true;
        this.status.verified = true;
      } else {
        this.status.isMatching = true;
      }
    } else if (this.status.isMatching && this.status.depthCounter === 2) {
      this.status.currentIndex++;
      // se lavoriamo con un indice
      if (this.status.path.range && this.status.checkIndex()) {
        if (this.isLast) {
          this.push(`{${node}:`);
        }
        this.status.recording = true;
        this.status.verified = true;
        this.status.depthCounter--;
        // --------------- condition per json path query -------
      }
      if (this.status.path.condition) {
        this.status.temp = `{${node}:`;
      }
    } else if (this.status.isMatching && this.status.depthCounter > 2) {
      if (this.status.temp.length > 0) {
        if (this.status.needComma) {
          this.status.temp = this.status.temp + `,{${node}:`;
        } else {
          this.status.temp = this.status.temp + `{${node}:`;
        }
      }
    }
    // ----------

    if (this.status.last !== FIRST) {
      this.status.depthCounter++;
    }

    this.status.lastkey = node;
    this.status.last = OPEN_OBJECT;
  }

  closeObject() {
    if (this.status.end) {
      return;
    }
    if (this.status.recording && this.status.verified && this.isLast) {
      if (this.status.depthCounter === 1) {
        this.stopHandler();
      } else {
        this.push(`}`);
      }
    }
    //------ condition case ----------
    else if (this.status.isMatching && this.status.depthCounter > 2) {
      if (this.status.temp.length > 0) {
        if (this.status.needComma) {
          this.status.temp = this.status.temp + ",";
        }
        this.status.temp = this.status.temp + "}";
      }
    }
    // -------------
    this.status.depthCounter--;
    this.status.last = CLOSE_OBJECT;
  }

  openArray() {
    if (this.status.end) {
      return;
    }
    if (this.status.recording && this.status.verified && this.isLast) {
      if (
        (this.status.depthCounter === 0 ||
          (this.status.isMatching && this.status.depthCounter === 1)) &&
        this.status.path.value !== '"$"' // accrocco;
      ) {
        this.stopHandler();
      } else {
        if (this.status.needComma) {
          this.push(",[");
        } else {
          this.push("[");
        }
      }
    }
    // ------ condition case -------
    else if (this.status.isMatching && this.status.depthCounter > 2) {
      if (this.status.temp.length > 0) {
        if (this.status.needComma) {
          this.status.temp = this.status.temp + ",";
        }
        this.status.temp = this.status.temp + "[";
      }
    } else if (this.status.depthCounter === 3) {
      this.status.temp = "";
    } else if (this.status.isMatching && this.status.depthCounter === 2) {
      this.status.currentIndex++;
      if (this.status.path.range && this.status.checkIndex()) {
        if (this.isLast) {
          this.push(`[`);
        }
        this.status.recording = true;
        this.status.verified = true;
        this.status.depthCounter--; // da verificare
        // --------------- condition per json path query -------
      } else if (this.status.path.condition) {
        this.status.temp = `[`;
      }
    }
    // ---------------
    this.status.depthCounter++;
    this.status.last = OPEN_ARRAY;
  }

  closeArray() {
    if (this.status.end) {
      return;
    }
    if (this.status.recording && this.status.verified && this.isLast) {
      if (this.status.depthCounter === 1) {
        this.stopHandler();
        this.status._needComma = true;
        if (!this.status.path.range && !this.status.path.hascondtion) {
          this.push(`]`);
        }
      } else {
        this.push(`]`);
      }
    } //------ condition case close array----------
    else if (this.status.isMatching && this.status.depthCounter > 3) {
      if (this.status.temp.length > 0) {
        if (this.status.needComma) {
          this.status.temp = this.status.temp + ",";
        }
        this.status.temp = this.status.temp + "]";
      }
    }
    this.status.depthCounter--;
    //  if (this.status.depthCounter < 3) {
    // this.status.currentIndex=0;
    // }
    this.status.last = CLOSE_ARRAY;
  }

  key(node: any) {
    if (this.status.end) {
      return;
    }
    if (
      this.status.depthCounter === 1 &&
      this.status.recording &&
      this.isLast
    ) {
      this.stopHandler();
    }
    if (this.status.recording && this.status.verified && this.isLast) {
      if (this.status.needComma) {
        this.push(`,${node}:`);
      } else {
        this.push(`${node}:`);
      }
    } else if (
      this.status.depthCounter === 1 &&
      this.status.path.value === node
    ) {
      if (!this.status.isInArray) {
        this.status.recording = true;
        this.status.verified = true;
      } else {
        this.status.isMatching = true;
      }
    } //------ condition case key----------
    else if (this.status.isMatching && this.status.depthCounter > 2) {
      if (this.status.temp.length > 0) {
        if (this.status.needComma) {
          this.status.temp = this.status.temp + ",";
        }
        this.status.temp = this.status.temp + `${node}:`;
      }
    }
    this.status.lastkey = node;
    this.status.last = KEY;
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
          this.push(",");
        }
        this.push(`${node}`);
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
          status.temp = status.temp + ",";
        }
        status.temp = status.temp + node;
      }
    }
    status.last = VALUE;
  }

  verifyCondition(value): boolean {
    const condition = this.status.path.condition;
    return (
      this.status.isMatching &&
      this.status.depthCounter === 3 &&
      condition.key === this.status.lastkey &&
      (this.status.last === KEY || this.status.last === OPEN_OBJECT) &&
      condition.value === value
    );
  }
}
