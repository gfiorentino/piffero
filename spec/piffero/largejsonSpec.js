
describe("piffero large", function() {
    const Piffero = require('../../dist/src/piffero').Piffero;
    const fs  =  require('fs');
    let stream
    beforeEach( function() {   
      stream = fs.createReadStream('spec/jsonFiles/large.json');
    });

    it("simple jsonpath", async function() {
        const result = Piffero.findPath(stream, '$')
        const string = await streamToString(result);
       // console.log(string);
        //  expect(string).toBe('{"lastName":"doe"}');
        JSON.parse(string)
      
    });
    
    it("simple jsonpath array", async function() {
        const result = Piffero.findPath(stream, '$[1]')
        const string = await streamToString(result);
         console.log(string);
        //  expect(string).toBe('{"lastName":"doe"}');
        // JSON.parse(string)
      
      }); 
    
});

 async function streamToString (stream) {
  const chunks = []
  return new Promise((resolve, reject) => {
    stream.on('data', chunk => chunks.push(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  })
}