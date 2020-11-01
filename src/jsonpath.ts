import { PifferoJsonPathError, PATH_ERROR_MESSAGE } from "./pifferoerror";
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

export interface ParsedPath {
  value: string;
  range?: { start?: number; end?: number; step?: number };
  filter?: string; // ?? not supported yet
  next: ParsedPath;
  recursiveDescendant: boolean; // ?? (dito nel culo) not supported yet
}

export class JSONPath {
  static parse(jsonPath: string): ParsedPath {
    if (!jsonPath.startsWith("$")) {
      throw new PifferoJsonPathError(`${PATH_ERROR_MESSAGE}: ${jsonPath}`);
    }

    const paths = jsonPath.split(".");
    return JSONPath.buildParsedPath(jsonPath, paths);
  }

  // need refactoring for perfomance
  private static buildParsedPath(
    jsonPath: string,
    paths: string[]
  ): ParsedPath {
    if (paths.length === 0) {
      return null;
    }
    let value = paths[0];
    let range = null;
    if (value.endsWith("]")) {
      value = value.substr(0, value.length - 1);
      const splitted = value.split("[");
      value = splitted[0];
      if (splitted.length < 2) {
        throw new PifferoJsonPathError(`${PATH_ERROR_MESSAGE}: ${jsonPath}`);
      }
      range = { start: Number(splitted[1]) };
    }

    return {
      value,
      next: JSONPath.buildParsedPath(jsonPath, paths.slice(1)),
      range: range,
      recursiveDescendant: false,
    };
  }
}
