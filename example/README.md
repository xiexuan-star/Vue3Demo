### 极简Diff
```typescript
function diff1(n1: VNode, n2: VNode, container: Container) {
  const oldChildren = n1.children as Array<VNode>;
  const newChildren = n2.children as Array<VNode>;
  const oldLen = oldChildren.length;
  const newLen = newChildren.length;
  const commonLen = Math.min(oldLen, newLen);
  for (let i = 0; i < commonLen; i++) {
    patch(oldChildren[i], newChildren[i], container);
  }
  if (oldLen > commonLen) {
    for (let i = commonLen; i < oldLen; i++) {
      unmount(oldChildren[i]);
    }
  } else if (newLen > commonLen) {
    for (let i = commonLen; i < newLen; i++) {
      patch(null, newChildren[i], container);
    }
  }
}
```
### 简单Diff
```typescript
  function diff(n1: VNode, n2: VNode, container: Container) {
    const oldChildren = n1.children as Array<VNode>;
    const newChildren = n2.children as Array<VNode>;
    const oldLen = oldChildren.length;
    const newLen = newChildren.length;
    // 当前递增序列中最大的index
    let lastIndex = 0;
    for (let i = 0; i < newLen; i++) {
      const newNode = newChildren[i];
      let find = false;
      for (let j = 0; j < oldLen; j++) {
        const oldNode = oldChildren[j];
        if (oldNode.key === newNode.key) {
          find = true;
          patch(oldNode, newNode, container);
          // 如果节点在旧列表中的索引不满足递增,就说明需要移动
          if (j < lastIndex) {
            const preNode = newChildren[i - 1];
            if (preNode) {
              const anchor = preNode.el?.nextSibling;
              // 移动到已经排序好的上一个新节点的后面
              insert(oldNode.el, container, anchor);
            }
          } else {
            lastIndex = j;
          }
          break;
        }
      }
      // 如果在旧节点中没找到，说明是新增
      if (!find) {
        const preNode = newChildren[i - 1];
        let anchor = preNode ? preNode.el!.nextSibling : container.firstChild;
        patch(null, newNode, container, anchor);
      }
    }
    // 同时，如果旧节点在新节点中没找到，说明是移除
    for (let i = 0; i < oldLen; i++) {
      const oldNode = oldChildren[i];
      const has = newChildren.find(newNode => newNode.key === oldNode.key);
      if (!has) {
        unmount(oldNode);
      }
    }
  }
```
