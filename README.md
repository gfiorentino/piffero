# PIFFERO
The ultimate JSON SAX parser 

Piffero is an open SAX parser who work directely on the streams to get part of big JSON file.

Piffero can load Big file larger than memory used, end return the required content in a stream.

 ``` 
    ______________________________ . 
  =(____|_o_o_o_o_|_o_o_o_o_|*____| |
                                   '
 ```
# Get Started
## Javascirpt
```js
const piffero = require('piffero');
const fs = require('fs');

const stream = fs.createReadStream('employees.json');
const result = piffero.Piffero.findPath(stream, "$.employees[1]");


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
```
#### console result 
```js
{"name":"Joe","surname":"Black","phoneNumbers":[]}
```
### object inside an array 
```js
....
const result = piffero.Piffero.findPath(stream, "$.employees[0].phoneNumbers[1]");
.....
// the result as a stream
{"type":"home","number":"0123-4567-8910","test":true}
...

```
 