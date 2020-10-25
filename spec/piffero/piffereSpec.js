
describe("piffero john-doe", function() {
    const Piffero = require('../../dist/src/piffero').Piffero;
    const fs  =  require('fs');
    let stream
    beforeEach( function() {   
      stream = fs.createReadStream('spec/jsonFiles/john-doe.json');
    });

    it("simple jsonpath", async function() {
      const result = Piffero.findPath(stream, '$.lastName')
      const string = await streamToString(result);
      console.log(string);
      JSON.parse(string)
    
    }); 
    
    it("array jsonpath", async function() {

      const result = Piffero.findPath(stream, '$.phoneNumbers')
      const string = await streamToString(result);
      console.log(string);
      JSON.parse(string)
      // console.log(result);
     // toString(result);
      //demonstrates use of custom matche
    });

    it("element in an array jsonpath", async function() {

      const result = Piffero.findPath(stream, '$.phoneNumbers[1]')
      const string = await streamToString(result);
      console.log(string);
      JSON.parse(string)
      // console.log(result);
     // toString(result);
      //demonstrates use of custom matche
    });
    
    
});

 async function streamToString (stream) {
  const chunks = []
  return new Promise((resolve, reject) => {
    console.log(chunks);
    stream.on('data', chunk => chunks.push(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  })
}