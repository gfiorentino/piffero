import * as esprima from "esprima";
import * as  evaluate from "static-eval" 

export class ConditionEval {
  static createCondition(condition: string) {
    const conditionTokenized: {
      type: string;
      value: string;
    }[] = esprima.tokenize(condition);
  
    return  conditionTokenized;
  }

  static staticEval(value: string): string {
    let ast = esprima.parse(value).body[0].expression;
    let evaluated = evaluate(ast);
    if(evaluated === undefined){
      return value;
    }
    return '' + evaluated ;
  }
}
