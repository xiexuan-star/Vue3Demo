enum State {
  INITIAL = 1,
  TAG_OPEN,
  TAG_NAME,
  TEXT,
  TAG_END,
  TAG_END_NAME
}

function isAlpha(char: string) {
  return char >= 'a' && char <= 'z' || char >= 'A' && char <= 'Z';
}

function tokenized(str: string) {
  let currentState = State.INITIAL;
  const chars: string[] = [];
  const tokens: { type: string, content: string }[] = [];

  function consume() {
    str = str.slice(1);
  }

  function invalid(char: string) {
    throw new Error(`invalid start token ${ char }`);
  }

  while (str) {
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
        } else {
          invalid(char);
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
        } else {
          invalid(char);
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
            content: chars.join('')
          });
          chars.length = 0;
          consume();
        } else {
          invalid(char);
        }
        break;
      case State.TEXT:
        if (isAlpha(char)) {
          chars.push(char);
          consume();
        } else if (char === '<') {
          currentState = State.TAG_OPEN;
          tokens.push({
            type: 'text',
            content: chars.join('')
          });
          chars.length = 0;
          consume();
        } else {
          invalid(char);
        }
        break;
      case State.TAG_END:
        if (isAlpha(char)) {
          currentState = State.TAG_END_NAME;
          chars.push(char);
          consume();
        } else {
          invalid(char);
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
            content: chars.join('')
          });
          chars.length = 0;
          consume();
        }
        break;
    }
  }
  return tokens;
}

console.log(tokenized('<section>testContent</section>'));
