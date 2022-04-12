enum State {
  INITIAL = 1,
  TAG_OPEN,
  TAG_NAME,
  TEXT,
  TAG_END,
  TAG_END_NAME
}

interface Transform {
  (ast: AstItem, context: TraverseContext): void | Function;
}

interface TraverseContext {
  nodeTransforms: Transform[];

  replaceNode(node: AstItem): void;

  removeNode(): void;

  currentNode: AstItem | null;
  childIndex: number;
  parent: AstItem | null;
}

interface JSNode {
  type: string;
  id?: JSNode;
  value?: string;
  params?: Array<any>;
  return?: JSNode;
  body?: JSNode[];
  name?: string;
  arguments?: Array<any>;
  callee?: JSNode;
  elements?: Array<any>;
}

interface AstItem {
  type: string,
  jsNode?: JSNode
  tag?: string,
  content?: string,
  children: AstItem[]
}

interface TOKEN {
  type: string,
  name: string
}

function isAlpha(char: string) {
  return char >= 'a' && char <= 'z' || char >= 'A' && char <= 'Z' || char <= '9' && char >= '0';
}

function tokenized(str: string) {
  let currentState = State.INITIAL;
  const chars: string[] = [];
  const tokens: TOKEN[] = [];

  let valid = false;

  function consume() {
    str = str.slice(1);
    valid = true;
  }

  function checkValid(char: string) {
    if (!valid) {
      throw new Error(`invalid token ${ JSON.stringify(char) }`);
    }
  }

  while (str) {
    valid = false;
    const char = str[0];
    switch (currentState) {
      case State.INITIAL:
        if (char === '<') {
          currentState = State.TAG_OPEN;
          consume();
        } else if (isAlpha(char)) {
          currentState = State.TEXT;
          // 缓存char
          chars.push(char);
          consume();
        }
        break;
      case State.TAG_OPEN:
        if (isAlpha(char)) {
          currentState = State.TAG_NAME;
          chars.push(char);
          consume();
        } else if (char === '/') {
          currentState = State.TAG_END;
          consume();
        }
        break;
      case State.TAG_NAME:
        if (isAlpha(char)) {
          chars.push(char);
          consume();
        } else if (char === '>') {
          // 当遇到>时，不存在中间状态，故转为初始状态
          currentState = State.INITIAL;
          tokens.push({
            type: 'tag',
            name: chars.join('')
          });
          chars.length = 0;
          consume();
        }
        break;
      case State.TEXT:
        if (isAlpha(char) || char === ' ') {
          chars.push(char);
          consume();
        } else if (char === '<') {
          currentState = State.TAG_OPEN;
          tokens.push({
            type: 'text',
            name: chars.join('')
          });
          chars.length = 0;
          consume();
        }
        break;
      case State.TAG_END:
        if (isAlpha(char)) {
          currentState = State.TAG_END_NAME;
          chars.push(char);
          consume();
        }
        break;
      case State.TAG_END_NAME:
        if (isAlpha(char)) {
          chars.push(char);
          consume();
        } else if (char === '>') {
          currentState = State.INITIAL;
          tokens.push({
            type: 'tagEnd',
            name: chars.join('')
          });
          chars.length = 0;
          consume();
        }
        break;
    }
    if (char === '\n') {
      consume();
    }
    checkValid(char);
  }
  return tokens;
}

function createAST(tokens: TOKEN[]) {
  const res: AstItem = {
    type: 'Root',
    children: []
  };
  const stack = [res];
  tokens.forEach(token => {
    if (token.type === 'text') {
      const parent = stack[stack.length - 1];
      const item = { type: 'Text', content: token.name, children: [] };
      parent.children.push(item);
    } else if (token.type === 'tagEnd') {
      stack.pop();
    } else if (token.type === 'tag') {
      const parent = stack[stack.length - 1];
      const item = { type: 'Element', tag: token.name, children: [] };
      parent.children.push(item);
      stack.push(item);
    }
  });
  return res;
}

function dump(node: AstItem, indent = 0) {
  const type = node.type;
  const desc = type === 'Root' ? '' : type === 'Text' ? node.content : type === 'Element' ? node.tag : '';
  let result = '-'.repeat(indent) + `${ type }: ${ desc }\n`;
  if (node.children.length) {
    node.children.forEach(child => {
      result += dump(child, indent + 2);
    });
  }
  return result;
}

function traverseNode(ast: AstItem, context: TraverseContext) {
  // 设置上下文中的当前节点
  context.currentNode = ast;
  const transforms = context.nodeTransforms;
  const onExits: Function[] = [];
  for (let i = 0; i < transforms.length; i++) {
    const onExit = transforms[i](ast, context);
    if (onExit) {
      onExits.push(onExit);
    }

    if (!context.currentNode) return;
  }
  const children = context.currentNode?.children;
  if (children) {
    for (let i = 0; i < children.length; i++) {
      // 设置上下文中的parent与childIndex
      context.parent = ast;
      context.childIndex = i;
      traverseNode(children[i], context);
    }
  }
  // 所有子节点全部处理完毕后，执行退出处理
  while (onExits.length) {
    const onExit = onExits.pop();
    onExit && onExit();
  }
}

function transform(ast: AstItem) {
  const context: TraverseContext = {
    nodeTransforms: [transformRoot, transformText, transformElement, tagToH2IfChildrenHasArticle, fromPtoH1, doubleText],
    replaceNode(node: AstItem) {
      if (context.parent) {
        context.parent.children[context.childIndex] = node;
        context.currentNode = node;
      }
    },
    removeNode() {
      const { parent, childIndex } = context;
      if (parent) {
        parent.children.splice(childIndex, 1);
        context.currentNode = null;
      }
    },
    currentNode: ast,
    childIndex: 0,
    parent: null
  };
  traverseNode(ast, context);
  console.log(dump(ast));
}

function fromPtoH1(ast: AstItem) {
  if (ast.type === 'Element' && ast.tag === 'p') {
    ast.tag = 'h1';
  }
}

function doubleText(ast: AstItem) {
  if (ast.type === 'Text') {
    ast.content! += ast.content!;
  }
}

function textNodeToElementNode(ast: AstItem, context: TraverseContext) {
  ast.type === 'Text' && context.replaceNode({
    type: 'Element',
    tag: 'article',
    children: []
  });
}

function removeH2Tag(ast: AstItem, context: TraverseContext) {
  if (ast.type === 'Element' && ast.tag === 'h2') {
    context.removeNode();
  }
}

function tagToH2IfChildrenHasArticle(ast: AstItem) {
  // 进入阶段逻辑
  return () => {
    // 退出阶段逻辑
    if (ast.type === 'Element' && ast.children.find(child => child.type === 'Element' && child.tag === 'article')) {
      ast.tag = 'h2';
    }
  };
}

function createStringLiteral(value: string) {
  return {
    type: 'StringLiteral',
    value
  };
}

function createIdentifier(name: string): JSNode {
  return { type: 'Identifier', name };
}

function createArrayExpression(elements: Array<any>): JSNode {
  return { type: 'ArrayExpression', elements };
}

function createCallExpression(callee: string, args: Array<any>): JSNode {
  return { type: 'CallExpression', callee: createIdentifier(callee), arguments: args };
}

function createReturnStatement(node: JSNode) {
  return {
    type: 'ReturnStatement',
    return: node
  };
}

function transformText(node: AstItem) {
  if (node.type !== 'Text') return;
  node.jsNode = createStringLiteral(node.content!);
}

function transformElement(node: AstItem) {
  return () => {
    if (node.type !== 'Element') return;
    const callExp = createCallExpression('h', [createStringLiteral(node.tag!)]);
    if (node.children?.length) {
      callExp.arguments!.push(createArrayExpression(node.children.map(child => child.jsNode)));
    }
    node.jsNode = callExp;
  };
}

function transformRoot(node: AstItem) {
  return () => {
    if (node.type !== 'Root') return;
    // 模板的根节点
    const vnodeJSAST = node.children[0].jsNode!;
    node.jsNode = {
      type: 'FunctionDecl',
      id: createIdentifier('render'),
      params: [],
      body: [createReturnStatement(vnodeJSAST)]
    };
  };
}

function compiler(template: string) {
  const tokens = tokenized(template);
  const ast = createAST(tokens);
  transform(ast);
  return generate(ast.jsNode!);
}

function generate(node: JSNode) {
  const context = {
    code: '',
    push(code: string) {
      context.code += code;
    },
    currentIndent: 0,
    newline() {
      context.code += `\n${ ' '.repeat(context.currentIndent * 2) }`;
    },
    indent() {
      context.currentIndent++;
      context.newline();
    },
    deIndent() {
      context.currentIndent--;
      context.newline();
    }
  };
  genCode(node, context);
  return context.code;
}

function genCode(node: JSNode, context: any) {
  switch (node.type) {
    case 'FunctionDecl':
      genFunctionDecl(node, context);
      break;
    case 'ReturnStatement':
      genReturnStatement(node, context);
      break;
    case 'CallExpression':
      genCallExpression(node, context);
      break;
    case 'StringLiteral':
      genStringLiteral(node, context);
      break;
    case 'ArrayExpression':
      genArrayExpression(node, context);
      break;
  }
}

function genNodeList(nodeList: JSNode[], context: any) {
  const { push } = context;
  nodeList.forEach((n, index) => {
    genCode(n, context);
    if (index < nodeList.length - 1) {
      push(',');
    }
  });
}

function genFunctionDecl(node: JSNode, context: any) {
  const { push, indent, deIndent } = context;
  push(`function ${ node.id!.name } (`);
  genNodeList(node.params!, context);
  push(') {');
  indent();
  node.body?.forEach(n => genCode(n, context));
  deIndent();
  push('}');
}

function genStringLiteral(node: JSNode, context: any) {
  const { push } = context;
  push(`"${ node.value }"`);
}

function genReturnStatement(node: JSNode, context: any) {
  const { push } = context;
  push('return ');
  genCode(node.return!, context);
}

function genCallExpression(node: JSNode, context: any) {
  const { push } = context;
  push(`${ node.callee!.name }(`);
  genNodeList(node.arguments!, context);
  push(')');
}

function genArrayExpression(node: JSNode, context: any) {
  const { push } = context;
  push(`[`);
  genNodeList(node.elements!, context);
  push(']');
}

console.log(compiler(`
<header>
<h1>firstTitle</h1>
<h2>secondTitle</h2>
<article>this is article content</article>
</header>
`));
