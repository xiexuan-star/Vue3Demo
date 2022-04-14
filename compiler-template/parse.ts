/**
 * DATA initial mode
 * CDATA
 * RCDATA
 * RAWTEXT
 *
 * HTML实体
 * */

enum TextNodes {
  DATA = 'DATA',
  RCDATA = 'RCDATA',
  RAWTEXT = 'RAWTEXT',
  CDATA = 'CDATA'
}

interface Context {
  source: string;

}

function parse(str: string) {
  const context: Context = { source: str };
}
