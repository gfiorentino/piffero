
describe("piffero large", function() {
  const Piffero = require('../../dist/src/piffero').Piffero;
  const results = require('./results'); 
  const fs  =  require('fs');
  let stream
  beforeEach( function() {   
    stream = fs.createReadStream('spec/jsonFiles/large.json');
  });

  it("simple jsonpath", async function() {
      const result = Piffero.findPath(stream, '$')
      const string = await streamToString(result);  
      expect(JSON.stringify(JSON.parse(string))).toBe(results.SIMPLE_JSON_LARGE);
  }); 
    
    it("simple jsonpath array", async function() {
      const result = Piffero.findPath(stream, '$[1]')
      const string = await streamToString(result);
      expect(string).toBe(results.SIMPLE_JSON_ARRAY);
    });  
   

  it("simple jsonpath array", async function() {
    const result = Piffero.findPath(stream, '$[2].tags')
    const string = await streamToString(result);
    expect(string).toBe('["cillum","fugiat","ad","cillum","eu"]');
  });  

  it("simple jsonpath array primitive", async function() {
    const result = Piffero.findPath(stream, '$[2].tags[2]')
    const string = await streamToString(result);
    expect(string).toBe('"ad"');
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
