import * as clarinet from "./libs/clarinet";

import { JSONPath, ParsedPath } from "./jsonpath";
import { Duplex, Readable, Stream } from "stream";
import { PifferoStatus } from "./pifferostatus2";


export  class Piffero  {
  static findPath(stream: Readable, jsonPath: string): Stream {
    const parsedPath = JSONPath.parse(jsonPath);
    return Piffero._findPathRecursive(stream, parsedPath);

  } 

  private static _findPathRecursive(stream: Readable, parsedPath: ParsedPath): Duplex {
     
  
    const cStream = (clarinet as any).createStream();

    const output: Duplex = new Stream.Transform(); // Readable = new Readable();

    let output2: Duplex ;
    const pifferoStatus: PifferoStatus = new PifferoStatus(parsedPath); 

    if (pifferoStatus.hasNext()) {
      output2 = Piffero._findPathRecursive(output, pifferoStatus.path.next);
    }
    const checkStreams = () => {
      if(pifferoStatus.end) {
        cStream.destroy();
        stream.unpipe();
        stream.destroy();
      }
    } 
    cStream.on("error", (e) => {
      console.error("error!", e);
    });


// --- OPEN OBJECT -----------------------------------------------------------
    cStream.on("openobject", (node) => {
      checkStreams();
      if(pifferoStatus.end) {
        return
      }
      if (pifferoStatus.recording && pifferoStatus.verified) {
        if(pifferoStatus.depthCounter === 0 || 
          pifferoStatus.isMatching && pifferoStatus.depthCounter === 1 ){
          pifferoStatus.recording = false;
          pifferoStatus.verified = false;  
          pifferoStatus.end = true
        }
        else {
          if (pifferoStatus.needComma) {
          output.push(",");
          }
          output.push(`{"${node}":`);
        }
      } if (pifferoStatus.path.value === node && pifferoStatus.depthCounter === 0) {
        
        if(!pifferoStatus.isInArray)  {
          pifferoStatus.recording = true;
          pifferoStatus.verified = true;
        } else {
          pifferoStatus.isMatching = true; 
        }
      } else if (pifferoStatus.isMatching && pifferoStatus.depthCounter === 2) {
        pifferoStatus.currentIndex++;
        if (pifferoStatus.currentIndex === pifferoStatus.path.range.start){
          output.push(`{"${node}":`);
          pifferoStatus.recording = true;
          pifferoStatus.verified = true;      
          pifferoStatus.decrementDepthConnter();
        }
      } 
      pifferoStatus.incrementDepthConnter();
      pifferoStatus.last = "openobject";
    });

    
// --- OPEN ARRAY -----------------------------------------------------------

    cStream.on("openarray", () => {
      checkStreams();
      if(pifferoStatus.end) {
        return
      }
      if (pifferoStatus.recording && pifferoStatus.verified) {
        if (pifferoStatus.needComma) {
          output.push(',');
        }
        output.push('[');
      }
      pifferoStatus.incrementDepthConnter();
      pifferoStatus.last = "openarray";
    });


// --- CLOSE OBJECT  -------------------------------------------------------  
    cStream.on("closeobject", () => {
      checkStreams();
      if(pifferoStatus.end) {
        return
      }
      if (pifferoStatus.recording && pifferoStatus.verified) {
        if (pifferoStatus.depthCounter === 1) {
          pifferoStatus.recording = false;
          pifferoStatus.end = true;
        } else {
          output.push(`}`);
        }
      }
      pifferoStatus.decrementDepthConnter();
      
      pifferoStatus.last = "closeobject";
    });

// --- CLOSE ARRAY  -------------------------------------------------------  

    cStream.on("closearray", () => {
      checkStreams();
      if(pifferoStatus.end) {
        return
      }
      if (pifferoStatus.recording && pifferoStatus.verified) {  
        if (pifferoStatus.depthCounter === 1) {
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

// --- KEY  --------------------------------------------------------  
    cStream.on("key", (node) => {
     checkStreams();
      if(pifferoStatus.end) {
        return
      }
      if (pifferoStatus.depthCounter === 1 && pifferoStatus.recording) {
        pifferoStatus.recording = false;
        pifferoStatus.end = true;
      }
      if (pifferoStatus.recording && pifferoStatus.verified) {
        if (pifferoStatus.needComma) {
          output.push(",");
        }
        output.push(`"${node}":`);
      }  
      if (pifferoStatus.depthCounter === 1 && pifferoStatus.path.value === node) {
        if (!pifferoStatus.isInArray)  {
          pifferoStatus.recording = true;
          pifferoStatus.verified = true;
        } else {
          pifferoStatus.isMatching = true;
        }
      } 
      pifferoStatus.last = "key";
    });

//--- VALUE -----------------------------------------------------------
    cStream.on("value",  (node) => {
      if(pifferoStatus.last === "openarray" && pifferoStatus.depthCounter === 2){
        pifferoStatus.isPrimitiveTypeArray = true;
      } 
      if (pifferoStatus.isInArray && pifferoStatus.isMatching && pifferoStatus.isPrimitiveTypeArray && pifferoStatus.depthCounter === 2) {
        pifferoStatus.currentIndex++;
        if( pifferoStatus.currentIndex === pifferoStatus.path.range.start ) {
          output.push(JSON.stringify(node));
          pifferoStatus.recording = false;
          pifferoStatus.end = true;
        }
      } 
      if (pifferoStatus.recording && pifferoStatus.verified) {
        if (pifferoStatus.needComma) {
          output.push(",");
        }
        output.push(JSON.stringify(node));

        if (pifferoStatus.depthCounter === 1) {
          pifferoStatus.recording = false;
          pifferoStatus.end = true;
        }
      }
      pifferoStatus.last = "value";
    });

    const endOutput = () => {
      output.push(null);
    }  
    
    cStream.on("end", () =>{
      if(!pifferoStatus.close) {
        endOutput();
      }
    });

    cStream.on("close",  () => {
      if(!pifferoStatus.close) {
        endOutput();
        pifferoStatus.close = true;
      }
    });

    stream.pipe(cStream);
     if (pifferoStatus.hasNext()) {
       return output2;
    } else {
      return output; 
    }
  }

}
