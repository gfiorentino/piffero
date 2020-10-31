
import { ParsedPath } from "./jsonpath";

export class PifferoStatus {
    //abbiamo verificato la condizione
    verified: boolean = false;
    // sto "registrando"
    recording: boolean = false;
    //sono in un array e cerco
    isInArray: boolean = false;
    // conta a che livello sono sceso per aggiornare gli indici
    private _depthCounter: number = 0;
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
      if (counter >= 0) {
        this._depthCounter = counter;
      }
    }
    get depthCounter() {
      return this._depthCounter;
    }
  
    incrementDepthConnter(){
      if(this.recording || this.isInArray) {
        this._depthCounter++;
      }
    }
  
    decrementDepthConnter(){
      if(this.recording || this.isInArray) {
        this._depthCounter--;
      }
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