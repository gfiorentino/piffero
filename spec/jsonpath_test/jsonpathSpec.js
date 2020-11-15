
describe("JsonPath", function() {
    const JSONPath = require('../../dist/src/jsonpath').JSONPath;

    it("simple jsonpath", function() {
      const result = JSONPath.parse('$.first.second')
      //demonstrates use of custom matcher
      expect(result.value).toBe('$');
      let next = result.next;
      expect(next.value).toBe('first');
      let next2 = next.next;
      expect(next2.value).toBe('second'); 
    });

   it("simple jsonpath wiith index", function() {
      const result = JSONPath.parse('$.first[1].second[2]')
        //demonstrates use of custom matcher
        expect(result.value).toBe('$');
        let next = result.next;
        let next2 = next.next;
        expect(next.value).toBe('first');
        expect(next.range.start).toBe(1);
 
        expect(next2.value).toBe('second'); 
        expect(next2.range.start).toBe(2);
    })


    it("simple jsonpath wiith index", function() {
      const result = JSONPath.parse('$.first[1].second[?(@.attribute==="asd")]')
        //demonstrates use of custom matcher
        expect(result.value).toBe('$');
        let next = result.next;
        let next2 = next.next;
        expect(next.value).toBe('first');
        expect(next.range.start).toBe(1);
 
        expect(next2.value).toBe('second'); 
        expect(next2.condition).toEqual({key:"attribute", value:"asd"});
    })


    it("simple jsonpath wiith index", function() {
      
      const result = JSONPath.parse('$.first[?(@.att===2)].second[?(@.attribute==="asd")]')
        //demonstrates use of custom matcher
        expect(result.value).toBe('$');
        let next = result.next;
        let next2 = next.next;
        expect(next.value).toBe('first');
        expect(next.condition).toEqual({key:"att", value:"2"});
 
        expect(next2.value).toBe('second'); 
        expect(next2.condition).toEqual({key:"attribute", value:"asd"});
    })
    
  
 });
  