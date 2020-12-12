import { ParsedPath } from "./jsonpath";

export interface PifferoOpt {
  mode: "stream" | "string";
}

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

  temp = "";

  end: boolean = false;
  close: boolean = false;
  // conta a che livello sono sceso per aggiornare gli indici
  public _depthCounter: number = 0;
  public needBracketes: boolean = false;
  currentIndex: number = -1;

  private _last:
    | "openobject"
    | "closeobject"
    | "openarray"
    | "closearray"
    | "value"
    | "key"
    | "first";

  lastkey: string;

  set last(last) {
    this._last = last;
  }

  get last() {
    return this._last;
  }

  path: ParsedPath = undefined;

  constructor(path: ParsedPath) {
   
    this.path = path;
    if (this.path.range || path.condition) {
      this.isInArray = true;
      if (this.path.value === '"$"') {
        this._depthCounter = 1;
        this.isMatching = true;
      }
    } else if (this.path.value === '"$"') {
      if (!path.condition) {
        this.verified = true;
      }
      this.recording = true;
    }

    if (this.path.value !== '"$"'){
      this._last = "first";
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

  decrementDepthConnter() {
    this._depthCounter--;
    if (this._depthCounter === 0 && this.recording) {
      this.recording = false;
      this.end = true;
    }
  }

  hasNext(): boolean {
    return this.path.next !== null && this.path.next !== undefined;
  }

  private next(): ParsedPath {
    this.verified = false;
    this.isInArray = false;
    this.depthCounter = 0;
    this.currentIndex = -1;
    this.path = this.path.next;
    if (this.path.range) {
      this.isInArray = true;
    }
    this.isPrimitiveTypeArray = false;
    return this.path;
  }
}
