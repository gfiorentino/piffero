import * as esprima from "esprima";

export class ConditionEval {
  static createCondition(condition: string) {
    const conditionTokenized: {
      type: string;
      value: string;
    }[] = esprima.tokenize(condition);
    return conditionTokenized;
  }
}
