
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
      expect(string).toBe('{"lastName":"doe"}');
      JSON.parse(string)
    
    }); 
    
    it("array jsonpath", async function() {
      const result = Piffero.findPath(stream, '$.phoneNumbers')
      const string = await streamToString(result);
      expect(string).toBe('{"phoneNumbers":[{"type":"iPhone","number":"0123-4567-8888"},{"type":"home","number":"0123-4567-8910"}]}');
      JSON.parse(string);
    });

    it("element in an array jsonpath", async function() {
      const result = Piffero.findPath(stream, '$.phoneNumbers[1]')
      const string = await streamToString(result);
      expect(string).toBe('{"type":"home","number":"0123-4567-8910"}');
      JSON.parse(string);
    });
    
    
    it("element in an array jsonpath", async function() {
      const result = Piffero.findPath(stream, '$.phoneNumbers[1].number')
      const string = await streamToString(result);
      expect(string).toBe('{"number":"0123-4567-8910"}');
      JSON.parse(string);
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