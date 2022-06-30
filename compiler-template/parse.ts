/**
 * DATA initial mode
 * CDATA any symbol will be used as a char
 * RCDATA textarea and title tag
 * RAWTEXT style xmp iframe noembed noframes noscript .etc tag
 *         not support html entity
 *
 * HTML entity
 * */

enum TextNodes {
  DATA = 'DATA',
  RCDATA = 'RCDATA',
  RAWTEXT = 'RAWTEXT',
  CDATA = 'CDATA'
}

interface Context {
  source: string;
  mode: TextNodes;
}

function parse(str: string) {
  // 递归下降算法
  const context: Context = { source: str, mode: TextNodes.DATA };
  const nodes = parseChildren(context, []);
  return { type: 'Root', children: nodes };
}

function parseChildren(context: Context, stack: Array<any>) {
  //
  return [];
}
