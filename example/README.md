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
