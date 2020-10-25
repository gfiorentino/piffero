import * as clarinet from './libs/clarinet';
import { JSONPath, ParsedPath } from './jsonpath';
import { Readable, Stream } from 'stream';
import { PATH_DOESNT_MATCH, PifferoError } from './pifferoerror';

class PifferoStatus {
  //abbiamo verificato la condizione
  verified:boolean = false;
  // sto "registrando"
  recording: boolean = false;
  //sono in un array e cerco 
  isInArray: boolean = false;
  // conta a che livello sono sceso per aggiornare gli indici 
  depthCounter?: number = 0;
  currentIndex?: number = -1;
  path: ParsedPath = undefined;

  constructor(path: ParsedPath) {
    this.path = path;
  }
} 

export class Piffero {
    
    findPath(stream: Stream, jsonPath ): Stream { 
        const cStream  = clarinet.createStream();
        const output: Readable = new Readable();

        const parsedPath = JSONPath.parse(jsonPath);
        const pifferoStatus: PifferoStatus = new PifferoStatus(parsedPath);
    
        const next = parsedPath.next;
        output.push('');
        cStream.on("error", function (e) {
            // unhandled errors will throw, since this is a proper node
            console.error("error!", e)
          })


        cStream.on("openobject", function (node) {
          
            let currentPath = pifferoStatus.path;
            if( pifferoStatus.recording && pifferoStatus.verified){
                output.push(`{"${node}":`);
                return;
            }
            // se sono in un array al primo livello di profondita 
            else if (pifferoStatus.isInArray && pifferoStatus.depthCounter === 0 ) {
                // quanto siamo in profodita oggetti dentro oggetti 
                pifferoStatus.depthCounter++;
                pifferoStatus.currentIndex++;
                
                if (pifferoStatus.currentIndex === currentPath.range.start) {
                    if(currentPath.next){
                        pifferoStatus.path = currentPath.next
                        currentPath = currentPath.next;
                    }
                }
            }
          
            
            if(node === currentPath.value) {
                // se dovevo essere in un array vuol dire che il path non matcha
                if(currentPath.range){
                    throw new PifferoError(PATH_DOESNT_MATCH);
                } else if(!currentPath.next){
                  pifferoStatus.recording = true; 
                  pifferoStatus.verified = true;
                } else {
                    pifferoStatus.path = pifferoStatus.path.next;  
                }  
            }
        })

        cStream.on("openarray", function (node) {
            if( pifferoStatus.recording && pifferoStatus.verified ) {
                output.push(`"${node}":[`);
            }
            const currentPath = pifferoStatus.path;

            if(node === currentPath.value) {
                // se dovevo non sono in un array vuol dire che il path non matcha
                if(!currentPath.range){
                    throw new PifferoError(PATH_DOESNT_MATCH);
                } else if(!currentPath.next) { 
                  pifferoStatus.verified = true;  
                }  
             
                if ( currentPath.range.start === 0) { 
                    if(currentPath.next) {
                    pifferoStatus.path = pifferoStatus.path.next;
                   } else {
                    pifferoStatus.recording = true;
                   }
                } else {
                    // sono in un array
                    pifferoStatus.isInArray = true;
                   // pifferoStatus.currentIndex = 0;
                } 
            }
            // same object as above
        })

        cStream.on("closeobject", function () {
            if(pifferoStatus.recording && pifferoStatus.verified){
                output.push(`},`);
            } else {
                pifferoStatus.depthCounter--
            }            
        })

        cStream.on("closearray", function (node) {
            if(pifferoStatus.recording && pifferoStatus.verified){
                output.push(`],`);
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

        cStream.on("end", function() {
            // equivale a chiudere lo stream 
            // TODO: (forse) readable.unshift(chunk[, encoding]) per supportare encoding 
            output.push(null);
        })
        stream.pipe(cStream);
        return output
    }

    findOne() {

    }

    findMany() {

    }

}