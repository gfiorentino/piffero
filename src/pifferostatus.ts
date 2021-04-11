import { ParsedPath } from "./jsonpath";

export type PifferoOpt = "string" | "stream";

export const OPEN_OBJECT = "object-open";
export const CLOSE_OBJECT = "object-close";
export const OPEN_ARRAY = "array-open";
export const CLOSE_ARRAY = "array-close";
export const VALUE = "value";
export const KEY = "key";
export const FIRST = "first";

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
    if (this.path.isbulk|| path.condition) {
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
