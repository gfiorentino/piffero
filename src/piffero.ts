import * as clarinet from "./libs/clarinet";
import { JSONPath, ParsedPath } from "./jsonpath";
import { Duplex, Readable, Stream } from "stream";

export class Piffero {
  static findPath(stream: Readable, jsonPath: string): Stream {
    return stream;
}
}

class MasterHandler {
  isLast = false;
  handlerIndex = 0;
  stepHandlers: SingleStepHandler [];
  currentHandler: SingleStepHandler;
  parse(stream: Readable) {
        this.currentHandler = this.stepHandlers[this.handlerIndex];
        const cStream = (clarinet as any).createStream();
        const  shiftParser = () => {
          if (this.stepHandlers[this.handlerIndex].recording && !this.isLast) {
              this.handlerIndex++;
              this.isLast = this.handlerIndex == this.stepHandlers.length - 1;
          }
      }

        // --- OPEN OBJECT -----------------------------------------------------------
        cStream.on("openobject", (node) => {
          this.currentHandler.openObject(node);
          shiftParser();
        });
    
        // ------ OPEN ARRAY -----------------------------------------------------------
        cStream.on("openarray", () => {
          this.currentHandler.openArray();
          shiftParser();
        });
    
        // --- CLOSE OBJECT  -------------------------------------------------------
        cStream.on("closeobject", () => {
          this.currentHandler.closeObject();
          shiftParser();
        });
    
        // --- CLOSE ARRAY  -------------------------------------------------------
        cStream.on("closearray", () => {          

        });
    
      // ------ KEY  --------------------------------------------------------
        cStream.on("key", (node) => {          
          this.currentHandler.key(node);
          shiftParser();
        });
        // ------ END KEY  --------------------------------------------------------
    
        //--- VALUE -----------------------------------------------------------
        cStream.on("value", (node) => {
          this.currentHandler.key(node);
          shiftParser();
        });
    
        //---END VALUE -----------------------------------------------------------
        cStream.on("end", () => {
        });
    
        cStream.on("close", () => {
        });
    }
}

class SingleStepHandler {
    recording = false;
    openObject(node: any){}
    closeObject(){}
    openArray(){}
    closeArray(){}
    key(node: any){}
    value(node: any){}
 
}