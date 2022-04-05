### 极简Diff

```typescript
function diff(n1: VNode, n2: VNode, container: Container) {
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

### 双端Diff

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
### 快速Diff
```typescript
function patchKeyedChildren(n1: VNode, n2: VNode, container: Container) {
  const oldChildren = n1.children as Array<VNode>;
  const newChildren = n2.children as Array<VNode>;
  let j = 0;
  let newEnd = newChildren.length - 1;
  let oldEnd = oldChildren.length - 1;
  let newStartNode = newChildren[j];
  let newEndNode = newChildren[newEnd];
  let oldStartNode = oldChildren[j];
  let oldEndNode = oldChildren[oldEnd];

  function oldStartNext() {
    oldStartNode = oldChildren[j];
  }

  function oldEndNext() {
    oldEndNode = oldChildren[--oldEnd];
  }

  function newStartNext() {
    newStartNode = newChildren[j];
  }

  function newEndNext() {
    newEndNode = newChildren[--newEnd];
  }

  while (j <= newEnd && j <= oldEnd) {
    if (newStartNode.key === oldStartNode.key) {
      patch(oldStartNode, newStartNode, container);
      j++;
      newStartNext();
      oldStartNext();
    } else if (newEndNode.key === oldEndNode.key) {
      patch(oldEndNode, newEndNode, container);
      newEndNext();
      oldEndNext();
    } else {
      break;
    }
  }
  if (j > newEnd && j > oldEnd) {
    // 绝对理想情况，顺序没有发生变化
    return;
  } else if (j > newEnd && j <= oldEnd) {
    // 说明指针相交，且旧节点更多，此时应该删除
    for (let i = j; i <= oldEnd; i++) {
      unmount(oldChildren[i]);
    }
  } else if (j <= newEnd && j > oldEnd) {
    // 与上一个情况相反，应新增节点
    const anchor = newChildren[newEnd + 1]?.el;
    while (j <= newEnd) {
      patch(null, newChildren[j++], container, anchor);
    }
  } else {
    // 没有出现上述情况，说明是非理想情况，需要进行移动
    // 构建索引数组
    const source = Array.from({ length: newEnd - j + 1 }).fill(-1) as number[];
    // 填充索引数组
    const newNodeMap: Record<string, number> = {};
    for (let i = j; i <= newEnd; i++) {
      const node = newChildren[i];
      newNodeMap[node.key] = i;
    }
    let needMove = false;
    let lastIndex = j;
    for (let i = j; i <= oldEnd; i++) {
      const oldNode = oldChildren[i];
      const newNodeIndex = newNodeMap[oldNode.key];
      const hasNewNode = newNodeIndex !== undefined;
      if (hasNewNode) {
        // 说明新旧节点可复用
        patch(oldNode, newChildren[newNodeIndex], container);
        source[newNodeIndex - j] = i;
        if (lastIndex > newNodeIndex) {
          // 同简单Diff，通过记录最大索引的方式判断索引是否为递增趋势
          // 如果后续index小于lastIndex，那说明不是递增，此时需要移动节点
          needMove = true;
        } else {
          lastIndex = newNodeIndex;
        }
      } else {
        // 如果没找到新节点，那说明需要卸载
        unmount(oldNode);
      }
    }
    if (needMove) {
      // 如果需要移动，则进入下一步，对最长递增子序列的判断
      const sequence = getSequence(source);
      let seqIndex = sequence.length - 1;
      for (let i = newEnd; i >= j; i--) {
        // 开始移动节点
        const sourceIndex = i - j;
        const sourceValue = source[sourceIndex];
        if (sourceValue === -1) {
          // 需要新增的节点,由于是从末尾开始遍历，插入到后一个节点之前即可
          const anchor = newChildren[i + 1]?.el;
          patch(null, newChildren[i], container, anchor);
        } else if (sourceIndex !== sequence[seqIndex]) {
          // 如果在递增序列中没找到该sourceIndex，说明需要移动
          // 同样移动至下一个节点元素之前即可
          const anchor = newChildren[i + 1]?.el;
          insert(newChildren[i].el, container, anchor);
        } else {
          seqIndex--;
        }
      }
    }
  }
}
```
