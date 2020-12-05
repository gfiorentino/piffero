const { parentPort, workerData } = require('worker_threads');
const Piffero = require('../src/piffero').Piffero;
const fs  =  require('fs');


async function streamToString (stream) {
    const chunks = []
    return new Promise((resolve, reject) => {
      stream.on('data', chunk => chunks.push(chunk))
      stream.on('error', reject)
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    })
}

function get(jsonpath, id) {
    stream = fs.createReadStream('./spec/jsonFiles/large-file.json');
    result = Piffero.findByPath(stream, jsonpath);
    streamToString(result).then(string => parentPort.postMessage({result:string, id:id}));
}
 parentPort.on('message', (message) => {
     return get(message.path, message.id);
 })
 
