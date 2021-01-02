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
  public depthCounter: number = 0;
  public needBracketes: boolean = false;
  currentIndex: number = -1;

 public last:
    | "openobject"
    | "closeobject"
    | "openarray"
    | "closearray"
    | "value"
    | "key"
    | "first";

  lastkey: string;

  path: ParsedPath = undefined;

  constructor(path: ParsedPath) {
    this.path = path;
    if (this.path.range || path.condition) {
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
      this.last = "first"
    }
  }

  get needComma(): boolean {
    return (
      this.last === "closearray" ||
      this.last === "closeobject" ||
      this.last === "value"
    );
  }

}
