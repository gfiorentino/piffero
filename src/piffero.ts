import * as clarinet from './libs/clarinet';
import {Stream, Readable} from 'stream';
import { JSONPath, ParsedPath } from './jsonpath';

interface PifferoStatus {
  verified: boolean;
  recording: boolean;
  path: ParsedPath;
} 

export class Piffero {
    
    findPath(stream: Stream, jsonPath ): Stream { 
        const cStream  = clarinet.createStream();
        const output: Readable = new Readable();

        const parsedPath = JSONPath.parse(jsonPath);
        const pifferoStatus = {
            verified: false,
            recording: false,
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
            // same object as above
            if(node) {
                node.path();
            }
        })

        cStream.on("openarray", function (node) {
            // same object as above
        })

        cStream.on("closeobject", function (node) {             
        })

        cStream.on("closearray", function (node) {

        })
  
        cStream.on("key", function(node) {

        })

        cStream.on("value", function(node) {

        })
        return output
    }

    findOne() {

    }

    findMany() {

    }

}