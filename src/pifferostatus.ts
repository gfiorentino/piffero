import { ParsedPath } from "./jsonpath";

export class PifferoStatus {
  //abbiamo verificato la condizione
  verified: boolean = false;
  // sto "registrando"
  recording: boolean = false;
  //sono in un array e cerco
  isInArray: boolean = false;
  // forse non serve arraay di primitivi
  isPrimitiveTypeArray = false;
  end: boolean = false;
  close: boolean = false;
  // conta a che livello sono sceso per aggiornare gli indici
  private _depthCounter: number = 0;
 
  private firstTime = true;

  private temp: string;

  private keyFouded: boolean =  false;
  
  public needBracketes: boolean = false;
  currentIndex: number = -1;

  last:
    | "openobject"
    | "closeobject"
    | "openarray"
    | "closearray"
    | "value"
    | "key";

  path: ParsedPath = undefined;

  lastkey: string;

  constructor(path: ParsedPath) {
    this.path = path;
    if (this.path.range || path.condition) {
      this.isInArray = true;
    } else if (this.hasNext()) {
      this.next();
    } else {
      if(!path.condition) {
        this.verified = true;
      }
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

  incrementDepthConnter() {
    if ( this.recording || ( this.isInArray 
      && ( (this.last !== 'key' && this.last) || this._depthCounter > 0 ))) {
      this._depthCounter++;
    }
    this.firstTime = false;
  }

  decrementDepthConnter() {
    if ((this.recording || this.isInArray) &&  this._depthCounter > 0) {
      this._depthCounter--;
    } if(this._depthCounter === 0 && this.recording) {
      this.recording = false;
      this.end = true;
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
    this.firstTime = true;
    this.isPrimitiveTypeArray = false;
    return this.path;
  }
}
