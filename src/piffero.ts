import * as clarinet from './libs/clarinet';
import { JSONPath, ParsedPath } from './jsonpath';
import { Readable, Stream } from 'stream';
import { PATH_DOESNT_MATCH } from './pifferoerror';

interface PifferoStatus {
 //abbiamo verificato la condizione
  verified: boolean;
 // sto "registrando"
  recording: boolean;
 //sono in un array e cerco 
  isInArray: boolean;
  currentIndex: number;
  path: ParsedPath;
} 

export class Piffero {
    
    findPath(stream: Stream, jsonPath ): Stream { 
        const cStream  = clarinet.createStream();
        const output: Readable = new Readable();

        const parsedPath = JSONPath.parse(jsonPath);
        const pifferoStatus: PifferoStatus = {
            verified: false,
            recording: false,
            isInArray : false,
            currentIndex: -1, 
            path: parsedPath.next, // per ora di "$" ce ne battiamo il cazzo  
        }
        
        const next = parsedPath.next;
        output.push('');
        cStream.on("error", function (e) {
            // unhandled errors will throw, since this is a proper node
            // event emitter.
            console.error("error!", e)
          })

        cStream.on("openobject", function (node) {
            if( pifferoStatus.recording && pifferoStatus.verified){
                output.push(`{"${node}":`);
                return;
            }
            const currentPath = pifferoStatus.path;
            
            if(node === currentPath.value) {
                if(currentPath.range){
                    throw new PifferoError(PATH_DOESNT_MATCH);
                } else if(currentPath.next === null || currentPath === undefined){
                  pifferoStatus.recording = true; 
                  pifferoStatus.verified = true;  
                }  
            }
        })

        cStream.on("openarray", function (node) {
            if(pifferoStatus.recording && pifferoStatus.verified){
                output.push(`"${node}":[`);
            }
            // same object as above
        })

        cStream.on("closeobject", function () {
            if(pifferoStatus.recording && pifferoStatus.verified){
                output.push(`}`);
            }             
        })

        cStream.on("closearray", function (node) {
            if(pifferoStatus.recording && pifferoStatus.verified){
                output.push(`]`);
            }
        })
  
        cStream.on("key", function(node) {
            if(pifferoStatus.recording && pifferoStatus.verified){
                output.push(`"${node}":`);
            }
        })

        cStream.on("value", function(node) {
            if(pifferoStatus.recording && pifferoStatus.verified){
                if(node instanceof String)
                output.push(`"${node}",`);
                else {
                    output.push(`"${node}",`);
                }
            }
        })

        stream.pipe(cStream);
        return output
    }

    findOne() {

    }

    findMany() {

    }

}