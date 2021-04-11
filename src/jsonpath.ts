import { PifferoJsonPathError, PATH_ERROR_MESSAGE } from "./pifferoerror";
import { ConditionEval } from "./conditioneval/conditioneval";
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
  indexes?: number[];
  isbulk: boolean;
  condition?: {
    key: string;
    value: string;
  }; // ?? not supported yet
  next: ParsedPath;
  hascondtion: boolean;
  recursiveDescendant: boolean; // ?? not supported yet
}

export class JSONPath {
  static parse(jsonPath: string): ParsedPath {
    if (!jsonPath.startsWith("$")) {
      throw new PifferoJsonPathError(`${PATH_ERROR_MESSAGE}: ${jsonPath}`);
    }

    jsonPath = jsonPath.replace("$.[", "$[");

    // accrocco;
    jsonPath = jsonPath.split("@.").join("!");
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
    let isBulk = false;
    let value = paths[0];
    let range = null;
    const indexes = [];
    let condition = null;
    if (value.endsWith("]")) {
      value = value.substr(0, value.length - 1);
      const splitted = value.split("[");
      value = splitted[0];
      if (splitted.length < 2) {
        throw new PifferoJsonPathError(`${PATH_ERROR_MESSAGE}: ${jsonPath}`);
      }
      condition = JSONPath.checkCondition(splitted[1]);
      if (!condition) {
        isBulk = true;
        const splittedIndexes = splitted[1].split(",");
      
        if (splittedIndexes.length > 1) {
          range = {
            start: Number(splittedIndexes[0])
          };
          splittedIndexes.forEach((element) => indexes.push(Number(element)));
        } else {
          const rangeArray = splitted[1].split(":");
          const [start, end, step] = rangeArray;
          range = {
            start: Number(start),
            end: end ? Number(end) : 0,
            step: step ? Number(step) : 1,
          };
          let _start = range.start;
          let _end = range.end;
          let _step = range.step;

          if (
            rangeArray.length === 1 || // onlly start
            // not end with start and step
            (end !== undefined &&
              end !== null &&
              end.trim() !== "0" &&
              rangeArray.length >= 2)
          ) {
            indexes.push(_start);
            for (let i = _start + _step; i < _end; i += _step) {
              indexes.push(i);
            }
          }
        }
      }
      indexes;
    }

    return {
      value: `"${value}"`,
      next: JSONPath.buildParsedPath(jsonPath, paths.slice(1)),
      condition: condition,
      range: range,
      isbulk: isBulk,
      indexes: indexes,
      recursiveDescendant: false,
      hascondtion: condition !== null && condition !== undefined,
    };
  }

  private static checkCondition(condition: string) {
    if (condition.trim().startsWith("?(!")) {
      condition = condition.replace("?(!", "");
      condition = condition.replace("===", "==");
      let conditions = condition.split("==");
      let value = conditions[1].substr(0, conditions[1].length - 1);
      if (
        value.startsWith("`") ||
        value.startsWith('"') ||
        value.startsWith("'")
      ) {
        value = '"' + value.substr(1, value.length - 2) + '"';
      } else {
        value = ConditionEval.staticEval(value);
      }
      return { key: `"${conditions[0]}"`, value: value };
    }
    return null;
  }
}
