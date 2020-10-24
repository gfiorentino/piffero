
describe("JsonPath", function() {
    const JSONPath = require('../../dist/src/jsonpath').JSONPath;

    it("simple jsonpath", function() {
      const result = JSONPath.parse('$.first.second')
    console.log(result);
      //demonstrates use of custom matcher
      expect(result.value).toBe('$');
      let next = result.next;
      expect(next.value).toBe('first');
      let next2 = next.next;
      expect(next2.value).toBe('second'); 
    });

    
  });
  