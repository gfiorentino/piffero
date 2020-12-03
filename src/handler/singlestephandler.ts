import { ParsedPath } from "../jsonpath";
import { Duplex } from "stream";
import { PifferoStatus } from "../pifferostatus";

export class SingleStepHandler {
  status: PifferoStatus;
  isLast = false;
  output: Duplex;
  constructor(path: ParsedPath, output: Duplex) {
    this.status = new PifferoStatus(path);
    this.output = output;
    this.isLast = path.next == undefined || path.next == null;
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
        this.output.push(`{${node}:`);
      }
    }
    if (this.status.path.value === node && this.status.depthCounter === 0) {
      if (!this.status.isInArray) {
        this.status.recording = true;
        this.status.verified = true;
      } else {
        this.status.isMatching = true;
      }
    } else if (this.status.isMatching && this.status.depthCounter === 2) {
      this.status.currentIndex++;
      // se lavoriamo con un indice

      if (
        this.status.path.range &&
        this.status.currentIndex === this.status.path.range.start
      ) {
        if (this.isLast) {
          this.output.push(`{${node}:`);
        }
        this.status.recording = true;
        this.status.verified = true;
        this.status.decrementDepthConnter();
        // --------------- condition per json path query -------
      } else if (this.status.path.condition) {
        this.status.temp = `{${node}:`;
      }
    } else if (this.status.isMatching && this.status.depthCounter > 2) {
      if (this.status.temp.length > 0) {
        if (this.status.needComma) {
          this.status.temp = this.status.temp + ",";
        }
        this.status.temp = this.status.temp + `{${node}:`;
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
    else if (this.status.isMatching && this.status.depthCounter > 2) {
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
    else if (this.status.isMatching && this.status.depthCounter > 2) {
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
    else if (this.status.isMatching && this.status.depthCounter > 3) {
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
    if (
      this.status.depthCounter === 1 &&
      this.status.recording &&
      this.isLast
    ) {
      this.status.recording = false;
      this.status.end = true;
    }
    if (this.status.recording && this.status.verified && this.isLast) {
      if (this.status.needComma) {
        this.output.push(",");
      }
      this.output.push(`${node}:`);
    }
    if (this.status.depthCounter === 1 && this.status.path.value === node) {
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
    this.status.last = "key";
  }
  value(node: any) {
    if (this.status.last === "openarray" && this.status.depthCounter === 2) {
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
        this.output.push(node);
        this.status.recording = false;
        this.status.end = true;
      }
    }
    if (this.status.recording && this.status.verified && this.isLast) {
      if (this.status.needComma) {
        this.output.push(",");
      }
      this.output.push(node);

      if (this.status.depthCounter === 1) {
        this.status.recording = false;
        this.status.end = true;
      }
      ///-----condition value -----
    } else if (this.verifyCondition(node)) {
      this.status.recording = true;
      this.status.verified = true;
      this.status.decrementDepthConnter();
      this.output.push(this.status.temp);
      if (this.status.needComma) {
        this.output.push(",");
      }
      this.output.push(node);
      this.status.temp = "";
    } else if (this.status.isMatching && this.status.depthCounter > 2) {
      if (this.status.temp.length > 0) {
        if (this.status.needComma) {
          this.status.temp = this.status.temp + ",";
        }
        this.status.temp = this.status.temp + node;
      }
    }
    this.status.last = "value";
  }

  verifyCondition(value): boolean {
    const condition = this.status.path.condition;
    return (
      condition &&
      this.status.depthCounter === 3 &&
      this.status.isMatching &&
      condition.key === this.status.lastkey &&
      (this.status.last === "key" || this.status.last === "openobject") &&
      condition.value === value
    );
  }
}
