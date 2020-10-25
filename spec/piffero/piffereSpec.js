
describe("piffero john-doe", function() {
    const Piffero = require('../../dist/src/piffero').Piffero;
    const fs  =  require('fs');
    let stream
    beforeAll ( function() {   
      stream = fs.createReadStream('spec/jsonFiles/john-doe.json');
    });

    it("simple jsonpath", async function() {

      const result = Piffero.findPath(stream, '$.lastName')
      console.log(await streamToString(result));
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