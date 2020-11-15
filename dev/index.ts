import * as fs from 'fs';
import { Piffero } from '../src/piffero';

const findLine = (stack: string): string => {
    const lines = stack.split("\\n");
    const pifferoLine = lines.find(line => line.indexOf('piffero.ts:') !== -1);
    if( pifferoLine ){
        const parts = /(.*)piffero\.ts:(\d+):(\d+)(.*)/.exec(pifferoLine)
       return parts[3]; // linea di codice che ha scritto il chunk
    }
    return '?';
}

const stream: fs.ReadStream = fs.createReadStream('./spec/jsonFiles/john-doe.json');

const result = Piffero.findPath(stream, '$.phoneNumbers[1]');

const consoleTable: Array<{chunk: string, line: string}> = [];
result.on('data', (chunk) => {
    consoleTable.push({chunk: '' + chunk, line: findLine(new Error().stack)});
});

result.on('end', () => {
    console.table(consoleTable, ['chunk', 'line']);
});