const { parentPort, workerData } = require('worker_threads');
const Piffero = require('../src/piffero').Piffero;
const fs  =  require('fs');


function get(jsonpath, id) {
    stream = fs.createReadStream('./spec/jsonFiles/large-file.json');
    const calback = result => parentPort.postMessage({result: result, id:id} );
    Piffero.findAsString(calback, stream, jsonpath);
}
 parentPort.on('message', (message) => {
     return get(message.path, message.id);
 })
 
