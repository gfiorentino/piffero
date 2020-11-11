import * as clarinet from "./libs/clarinet";

import { JSONPath, ParsedPath } from "./jsonpath";
import { Duplex, Readable, Stream } from "stream";
import { PifferoStatus } from "./pifferostatus";

export class Piffero {
  static findPath(stream: Readable, jsonPath: string): Stream {
    const cStream = (clarinet as any).createStream();

    const output: Duplex = new Stream.Transform(); // Readable = new Readable();
    const parsedPath = JSONPath.parse(jsonPath);
    const pifferoStatus: PifferoStatus = new PifferoStatus(parsedPath);

    cStream.on("error", (e) => {
      // unhandled errors will throw, since this is a proper node
      console.error("error!", e);
    });

    cStream.on("openobject", (node) => {
      let currentPath = pifferoStatus.path;
      // se sto registrando
      if (pifferoStatus.recording && pifferoStatus.verified) {
        if (pifferoStatus.needComma) {
          output.push(",");
        }
        output.push(`{"${node}":`);
      } // se sono in un array al primo livello di profondita
      else {
        if (pifferoStatus.isInArray && pifferoStatus.depthCounter === 0) {
          // quanto siamo in profondità oggetti dentro oggetti
          pifferoStatus.currentIndex++;
           
          if (pifferoStatus.currentIndex === currentPath.range.start) {
            if (pifferoStatus.hasNext()) {
              pifferoStatus.next();
              currentPath = pifferoStatus.path;
            }
            // sono in un array l'indice combaca e non ci sono next inizio a registrare
            else if(!pifferoStatus.end){
              pifferoStatus.recording = true;
              if(!currentPath.condition) {
                pifferoStatus.verified = true;
             }
            }
          }
        }
        if (node === currentPath.value) {
          // se dovevo essere in un array
          if (currentPath.range) {
            pifferoStatus.isInArray = true;
          } else if (!pifferoStatus.hasNext() &&! pifferoStatus.end) {
            pifferoStatus.recording = true;
            if(!currentPath.condition) {
              pifferoStatus.verified = true;
            }
            output.push(`{"${node}":`);
           
          } else if(pifferoStatus.hasNext()) {
            pifferoStatus.next();
          }
        }
        if (
          pifferoStatus.isInArray &&
          pifferoStatus.currentIndex === currentPath.range.start
        ) {
          if (pifferoStatus.hasNext()) {
            pifferoStatus.next();
          } else if(!pifferoStatus.end) {
            pifferoStatus.recording = true;
            if(!currentPath.condition) {
              pifferoStatus.verified = true;
           }
            output.push(`{"${node}":`);
          }
        }
      }
      pifferoStatus.incrementDepthConnter();
 
      pifferoStatus.last = "openobject";
    });

    cStream.on("openarray", () => {
      if (pifferoStatus.recording && pifferoStatus.verified) {
        if (pifferoStatus.needComma) {
          output.push(",");
        }
        output.push(`[`);
      }
      pifferoStatus.incrementDepthConnter();
      pifferoStatus.last = "openarray";
    });

    cStream.on("closeobject", () => {
      if (pifferoStatus.recording && pifferoStatus.verified) {
        if (pifferoStatus.depthCounter === 0) {
          pifferoStatus.recording = false;
          pifferoStatus.end = true;
        } else {
          output.push(`}`);
        }
      }
      pifferoStatus.decrementDepthConnter();
      
      pifferoStatus.last = "closeobject";
    });

    cStream.on("closearray", (node) => {
      if (pifferoStatus.recording && pifferoStatus.verified) {  
        if (pifferoStatus.depthCounter === 0) {
          pifferoStatus.recording = false;  
          pifferoStatus.end = true;      
          if(!pifferoStatus.path.range){
            output.push(`]`);
          }
        } else {
          output.push(`]`);
        }
      }
      pifferoStatus.decrementDepthConnter();
      pifferoStatus.last = "closearray";
    });

    cStream.on("key", (node) => {
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
        } else if (!currentPath.next && !pifferoStatus.end) {
          pifferoStatus.recording = true;
          pifferoStatus.verified = true;
          pifferoStatus.needBracketes = true;
          output.push(`{"${node}":`);
        } else if(pifferoStatus.hasNext()) {
          pifferoStatus.next();
        }
      }
      pifferoStatus.last = "key";
    });

    cStream.on("value",  (node) => {
      if(pifferoStatus.last === "openarray" ){
        pifferoStatus.isPrimitiveTypeArray = true;
      } 
      if (pifferoStatus.isInArray && !pifferoStatus.hasNext() && pifferoStatus.isPrimitiveTypeArray) {
        pifferoStatus.currentIndex++;
        if(pifferoStatus.currentIndex === pifferoStatus.path.range.start) {
          output.push(`"${node}"`);
          pifferoStatus.end = true;
        }
      } 
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
          // TODO chiudere tutti gli stream
          pifferoStatus.recording = false;
          pifferoStatus.end = true;
        }
      }
      pifferoStatus.last = "value";
    });

    const endoOutput = () => {
      // equivale a chiudere lo stream
      // TODO: (forse) readable.unshift(chunk[, encoding]) per supportare encoding
      if (pifferoStatus.needBracketes === true ) {
        output.push('}');
      }
      output.push(null);
    }    
    
    cStream.on("end", () => {
      endoOutput();
    });

    cStream.on("close",  () => {
      endoOutput();
    });

    stream.pipe(cStream);

    return output;
  }

  private findMany() {}
}
