# PIFFERO  [![Build Status](https://travis-ci.com/gfiorentino/piffero.svg?branch=master)](https://travis-ci.com/github/gfiorentino/piffero) [![Coverage Status](https://coveralls.io/repos/github/gfiorentino/piffero/badge.svg?branch=master)](https://coveralls.io/github/gfiorentino/piffero?branch=master) [![NPM version](https://img.shields.io/npm/v/piffero.svg)](https://www.npmjs.com/package/piffero)
The ultimate JSON SAX parser 

Piffero is an open source SAX parser who work directely on the streams to get part of big JSON files.

Piffero can load big files larger than memory used and return the required content in a stream.

 ``` 
    ______________________________ . 
  =(____|_o_o_o_o_|_o_o_o_o_|*____| |
                                   '
 ```
# Get Started

The version 1.0.0 only support the full qualified JSONpath

example : $.father.son.array[:index].attribute

The sintax that will be implemented in the next future and the examples from [Stefan Goessner's post](http://goessner.net/articles/JsonPath/) 

JSONPath         | Description                              |Implemented
-----------------|------------------------------------------|-----------------|
`$`               | The root object/element                 |<ul><li>- [x] </li></ul>
`@`                | The current object/element             |<ul><li>- [ ] </li></ul>
`.`                | Child member operator                  |<ul><li>- [x] </li></ul>
`..`	         | Recursive descendant operator; JSONPath borrows this syntax from E4X |<ul><li>- [ ] </li></ul>
`*`	         | Wildcard matching all objects/elements regardless their names |<ul><li>- [ ] </li></ul>
`[]`	         | Subscript operator |<ul><li>- [X] </li></ul>
`[,]`	         | Union operator for alternate names or array indices as a set| <ul><li>- [ ] </li></ul>
`[start:end:step]` | Array slice operator borrowed from ES4 / Python| <ul><li>- [ ] </li></ul>
`?()`              | Applies a filter (script) expression via static evaluation| <ul><li>- [ ] </li></ul>
`()`	         | Script expression via static evaluation | <ul><li>- [ ] </li></ul>

## JavaScript

Piffero is easy to use you only need to call the method findByPath(:inputStream, :jsonpath);
```js
const piffero = require('piffero');
const fs = require('fs');

const stream = fs.createReadStream('employees.json');
const result = piffero.Piffero.findByPath(stream, "$.employees[1]");

// ------ this code is only to console the content of the stream -------
  streamToString = async (stream) =>{
    const chunks = []
    return new Promise((resolve, reject) => {
      stream.on('data', chunk => chunks.push(chunk))
      stream.on('error', reject)
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    })
  }

printResult = async (result) => {
    const string  = await streamToString(result); 
    console.log(string);
}

printResult(result);
//---------------------------------------------------------------------
```
#### empoyees.json
```js

{
   "employees":[
      {
         "name":"John",
         "surname":"Doe",
         "phoneNumbers":[
            {
               "type":"iPhone",
               "number":"0123-4567-8888",
               "test":false
            },
            {
               "type":"home",
               "number":"0123-4567-8910",
               "test":true
            }
         ]
      },
      {
         "name":"Joe",
         "surname":"Black",
         "phoneNumbers":[
         ]
      }
   ]
}
```
#### console result 
```js
[{"name":"Joe","surname":"Black","phoneNumbers":[]}]
```
```js
// object inside an array 
const stream = fs.createReadStream('employees.json');
const result = piffero.Piffero.findPath(stream, "$.employees[0].phoneNumbers[1]");
.....
// the content of the stream
[{"type":"home","number":"0123-4567-8910","test":true}]
...
```
## Other tools
* Piffero is built on [Clarinet](https://github.com/dscape/clarinet) 
* You can try [Oboe](https://github.com/jimhigson/oboe.js)  
* You can also try [JSONPath Online Evaluator](https://jsonpath.com/)

enjoy piffero!!
