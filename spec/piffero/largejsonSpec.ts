import { streamToString } from "../utils";
import { Piffero } from "../../src/piffero"

describe("piffero large", function() {
  const results = require('./results'); 
  const fs  =  require('fs');
  let stream
  beforeEach( function() {   
    stream = fs.createReadStream('spec/jsonFiles/large.json');
  });

  it("simple jsonpath", async function() {
      const result = Piffero.findByPath(stream, '$')
      const string = await streamToString(result); 
      let callback =(json)=> { expect(JSON.stringify(JSON.parse(json))).toBe(results.SIMPLE_JSON_LARGE);}
      Piffero.findAsString( callback,stream, '$');  
      expect(JSON.stringify(JSON.parse(string))).toBe(results.SIMPLE_JSON_LARGE);
  }); 
    
    it("simple jsonpath array", async function() {
      const result = Piffero.findByPath(stream, '$[1]')
      const string = await streamToString(result);
      expect(string).toBe(results.SIMPLE_JSON_ARRAY);
    });  
   

  it("simple jsonpath array", async function() {
    const result = Piffero.findByPath(stream, '$[2].tags')
    const string = await streamToString(result);
    expect(string).toBe('["cillum","fugiat","ad","cillum","eu"]');
  });  

  it("simple jsonpath array primitive", async function() {
    const result = Piffero.findByPath(stream, '$[2].tags[2]')
    const string = await streamToString(result);
    expect(string).toBe('"ad"');
  });   

});

