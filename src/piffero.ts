import * as clarinet from './libs/clarinet';
import {Stream, ReadableStream} from 'stream';
//no piffero is done 

export class Piffero {
    
    findPath(stream: Stream, jsonPath ): Stream { 
        const cStream  = clarinet.createStream();
        const output: ReadableStream = new ReadableStream();
        output.push('');
        cStream.on("error", function (e) {
            // unhandled errors will throw, since this is a proper node
            // event emitter.
            console.error("error!", e)
          })

        cStream.on("openobject", function (node) {
            // same object as above
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