/* 
$	The root object/element
@	The current object/element
.	Child member operator
..	Recursive descendant operator; JSONPath borrows this syntax from E4X
*	Wildcard matching all objects/elements regardless their names
[]	Subscript operator
[,]	Union operator for alternate names or array indices as a set
[start:end:step]	Array slice operator borrowed from ES4 / Python
?()	Applies a filter (script) expression via static evaluation
()	Script expression via static evaluation
 */

export interface ParsedPath  {
    value: string,
    range?: {start?:number, end?: number, step?: number}
    filter?: string; // ?? not supported yet
    next: ParsedPath;
    recursiveDescendant: boolean; // ?? (dito nel culo) not supported yet
}

const PATH_ERROR_MESSAGE = 'Invalid json path' 

export class JSONPath{
    
    static parse(jsonPath: string): ParsedPath {
        if (!jsonPath.startsWith ('$.')){
            throw new PifferoJsonPathError(`${PATH_ERROR_MESSAGE}: jsonPath`);
        }
        
        const paths = jsonPath.split('.');
        return JSONPath.buildParsedPath(paths);
    }
    
    // need refactoring for perfomance 
    static buildParsedPath(paths: string[]): ParsedPath  {
        if(paths.length === 0) {
            return null;
        }
        let value = paths[0];
        let range = null;
        if (value.endsWith(']')) {
           value = value.substr(0, value.length-1)         
            const splitted = value.split('[');
            value = splitted[0];
            if(splitted.length < 2){
                throw new PifferoJsonPathError(`${PATH_ERROR_MESSAGE}: jsonPath`);
            }
            range = {start: Number(splitted[1])}
        }
    
       return {
            value,
            next: JSONPath.buildParsedPath(paths.slice(1)),
            range: range,
            recursiveDescendant: false,
        }
    }
    
}

export class PifferoJsonPathError extends Error{}