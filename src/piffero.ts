const clarinet = require("./libs/clarinet");

import { JSONPath, ParsedPath } from "./jsonpath";
import { Duplex, Readable, Stream } from "stream";

class PifferoStatus {
  //abbiamo verificato la condizione
  verified: boolean = false;
  // sto "registrando"
  recording: boolean = false;
  //sono in un array e cerco
  isInArray: boolean = false;
  // conta a che livello sono sceso per aggiornare gli indici
  private  _depthCounter: number = 0;
  currentIndex: number = -1;

  last:
    | "openobject"
    | "closeobject"
    | "openarray"
    | "closearray"
    | "value"
    | "key";
  path: ParsedPath = undefined;

  constructor(path: ParsedPath) {
    this.path = path;
    if (this.path.range) {
      this.isInArray = true;
    } else if (this.hasNext()) {
      this.next();
    } else {
      this.verified = true;
      this.recording = true;
    }
  }

  get needComma(): boolean {
    return (
      this.last === "closearray" ||
      this.last === "closeobject" ||
      this.last === "value"
    );
  }

  set depthCounter(counter: number) {
    if(counter >= 0) {
      this._depthCounter = counter;
    }
  }
  get depthCounter(){
    return this._depthCounter;
  }

  hasNext(): boolean {
    return this.path.next !== null && this.path.next !== undefined;
  }

  next(): ParsedPath {
    this.verified = false;
    //sono in un array e cerco
    this.isInArray = false;
    // conta a che livello sono sceso per aggiornare gli indici
    this.depthCounter = 0;
    this.currentIndex = -1;
    this.path = this.path.next;
    return this.path;
  }
}

export class Piffero {
  static findPath(stream: Readable, jsonPath: string): Stream {
    const cStream = new clarinet.createStream(null);

    const output: Duplex = new Stream.Transform(); // Readable = new Readable();

    const parsedPath = JSONPath.parse(jsonPath);
    const pifferoStatus: PifferoStatus = new PifferoStatus(parsedPath);

    cStream.on("error", function (e) {
      // unhandled errors will throw, since this is a proper node
      console.error("error!", e);
    });

    cStream.on("openobject", function (node) {
      let currentPath = pifferoStatus.path;
      if (pifferoStatus.recording && pifferoStatus.verified) {
        if (pifferoStatus.needComma) {
          output.push(",");
        }
        output.push(`{"${node}":`);
        pifferoStatus.depthCounter++;
      }
   
      // se sono in un array al primo livello di profondita
      else if (pifferoStatus.isInArray && pifferoStatus.depthCounter === 0) {

        // quanto siamo in profondità oggetti dentro oggetti
        pifferoStatus.depthCounter++;
        pifferoStatus.currentIndex++;
        if (pifferoStatus.currentIndex === currentPath.range.start) {
          if (currentPath.next) {
            pifferoStatus.next();
            currentPath = pifferoStatus.path;
          }
          // sono in un array l'indice combaca e non ci sono next inizio a registrare
          else {
            pifferoStatus.recording = true;
            pifferoStatus.verified = true;
          }
        }
      }

      if (node === currentPath.value) {
        // se dovevo essere in un array
        if (currentPath.range) {
          pifferoStatus.isInArray = true;
        } else if (pifferoStatus.hasNext()) {
          pifferoStatus.recording = true;
          pifferoStatus.verified = true;
        } else {
          pifferoStatus.next();
        }
      }
      if (
        pifferoStatus.isInArray &&
        pifferoStatus.currentIndex === currentPath.range.start
      ) {
        if (pifferoStatus.hasNext()) {
          pifferoStatus.next();
        } else {
          pifferoStatus.recording = true;
          pifferoStatus.verified = true;
          output.push(`{"${node}":`);
        }
      }
      pifferoStatus.last = "openobject";
    });

    cStream.on("openarray", function () {
      if (pifferoStatus.recording && pifferoStatus.verified) {
        if (pifferoStatus.needComma) {
          output.push(",");
        }
        output.push(`[`);
        pifferoStatus.depthCounter++;
      }
      pifferoStatus.last = "openarray";
    });

    cStream.on("closeobject", function () {
      if (pifferoStatus.recording && pifferoStatus.verified) {
        output.push(`}`);
        pifferoStatus.depthCounter--;
      } else if (pifferoStatus.isInArray) {
        pifferoStatus.depthCounter--;
      }
      if (pifferoStatus.depthCounter === 0) {
        pifferoStatus.recording = false;
      }

      pifferoStatus.last = "closeobject";
    });

    cStream.on("closearray", function (node) {
      if (pifferoStatus.recording && pifferoStatus.verified) {
        output.push(`]`);
        pifferoStatus.depthCounter--;
      } else if (pifferoStatus.isInArray) {
        pifferoStatus.depthCounter--;
      }
      pifferoStatus.last = "closearray";
    });

    cStream.on("key", function (node) {
      let currentPath = pifferoStatus.path;

      if (pifferoStatus.recording && pifferoStatus.verified) {
        if (pifferoStatus.needComma) {
          output.push(",");
        }
        output.push(`"${node}":`);
      }
      if (node === currentPath.value) {
        // se dovevo essere in un array
        if (currentPath.range) {
          pifferoStatus.isInArray = true;
          // se dovevo essere in un array vuol dire che il path non matcha
        } else if (!currentPath.next) {
          pifferoStatus.recording = true;
          pifferoStatus.verified = true;
          output.push(`{"${node}":`);
        } else {
          pifferoStatus.next();
        }
      }
      pifferoStatus.last = "key";
    });

    cStream.on("value", function (node) {
      if (pifferoStatus.recording && pifferoStatus.verified) {
        if (pifferoStatus.needComma) {
          output.push(",");
        }
        if (typeof node === "string" || node instanceof String) {
          output.push(`"${node}"`);
        } else {
          output.push(`${node}`);
        }
        //vuol dire che posso chiudere
        if (pifferoStatus.depthCounter === 0) {
          output.push(`}`);
          // TODO chiudere tutti gli stream
          pifferoStatus.recording = false;
        }
      }
      pifferoStatus.last = "value";
    });

    cStream.on("end", function () {
      // equivale a chiudere lo stream
      // TODO: (forse) readable.unshift(chunk[, encoding]) per supportare encoding
      output.push(null);
    });

    cStream.on("close", function () {});

    stream.pipe(cStream);
    return output;
  }

  private findMany() {}
}
