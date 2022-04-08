# 阅读《VUE设计与实现》

## 阅读进度记录,六级标题(灰色)未阅读,其他已阅读

### 第1章 权衡的艺术　2

#### 1.1　命令式和声明式　2

#### 1.2　性能与可维护性的权衡　3

#### 1.3　虚拟DOM的性能到底如何　4

#### 1.4　运行时和编译时　8

#### 1.5　总结　11

### 第2章 框架设计的核心要素　12

#### 2.1　提升用户的开发体验　12

#### 2.2　控制框架代码的体积　14

#### 2.3　框架要做到良好的Tree-Shaking　15

#### 2.4　框架应该输出怎样的构建产物　17

#### 2.5　特性开关　19

#### 2.6　错误处理　21

#### 2.7　良好的TypeScript类型支持　23

#### 2.8　总结　25

### 第3章　Vue.js 3的设计思路　27

#### 3.1　声明式地描述UI　27

#### 3.2　初识渲染器　29

#### 3.3　组件的本质　32

#### 3.4　模板的工作原理　34

#### 3.5　Vue.js是各个模块组成的有机整体　36

#### 3.6　总结　37

### 第4章　响应系统的作用与实现　40

#### 4.1　响应式数据与副作用函数　40

#### 4.2　响应式数据的基本实现　41

#### 4.3　设计一个完善的响应系统　43

#### 4.4　分支切换与cleanup　50

#### 4.5　嵌套的effect与effect栈　55

#### 4.6　避免无限递归循环　59

#### 4.7　调度执行　60

#### 4.8　计算属性computed与lazy　64

#### 4.9　watch的实现原理　71

#### 4.10　立即执行的watch与回调执行时机　75

#### 4.11　过期的副作用　77

#### 4.12　总结　82

### 第5章　非原始值的响应式方案　84

#### 5.1　理解Proxy和Reflect　84

#### 5.2　JavaScript对象及Proxy的工作原理　88

#### 5.3　如何代理Object　92

#### 5.4　合理地触发响应　102

#### 5.5　浅响应与深响应　108

#### 5.6　只读和浅只读　110

#### 5.7　代理数组　113

#### 5.7.1　数组的索引与 length　114

#### 5.7.2　遍历数组　119

#### 5.7.3　数组的查找方法　124

#### 5.7.4　隐式修改数组长度的原型方法　129

#### 5.8　代理Set和Map　132

#### 5.8.1　如何代理Set和Map　133

#### 5.8.2　建立响应联系　137

#### 5.8.3　避免污染原始数据　140

#### 5.8.4　处理forEach　143

#### 5.8.5　迭代器方法　147

#### 5.8.6　values与keys方法　152

#### 5.9　总结　155

### 第6章　原始值的响应式方案　158

#### 6.1　引入ref的概念　158

#### 6.2　响应丢失问题　160

#### 6.3　自动脱ref　164

#### 6.4　总结　166

### 第7章　渲染器的设计　170

#### 7.1　渲染器与响应系统的结合　170

#### 7.2　渲染器的基本概念　172

#### 7.3　自定义渲染器　175

#### 7.4　总结　179

### 第8章　挂载与更新　180

#### 8.1　挂载子节点和元素的属性　180

#### 8.2　HTML Attributes与DOM Properties　182

#### 8.3　正确地设置元素属性　184

#### 8.4　class的处理　189

#### 8.5　卸载操作　192

#### 8.6　区分vnode的类型　195

#### 8.7　事件的处理　196

#### 8.8　事件冒泡与更新时机问题　201

#### 8.9　更新子节点　204

#### 8.10　文本节点和注释节点　209

#### 8.11　Fragment　212

#### 8.12　总结　215

### 第9章　简单Diff算法　218

#### 9.1　减少DOM操作的性能开销　218

#### 9.2　DOM复用与key的作用　221

#### 9.3　找到需要移动的元素　225

#### 9.4　如何移动元素　228

#### 9.5　添加新元素　233

#### 9.6　移除不存在的元素　238

#### 9.7　总结　241

### 第10章 双端Diff算法　242

#### 10.1　双端比较的原理　242

#### 10.2　双端比较的优势　252

#### 10.3　非理想状况的处理方式　255

#### 10.4　添加新元素　263

#### 10.5　移除不存在的元素　268

#### 10.6　总结　270

### 第11章 快速Diff算法　271

#### 11.1　相同的前置元素和后置元素　271

#### 11.2　判断是否需要进行DOM移动操作　279

#### 11.3　如何移动元素　288

#### 11.4　总结　296

### 第12章 组件的实现原理　298

#### 12.1　渲染组件　298

#### 12.2　组件状态与自更新　301

#### 12.3　组件实例与组件的生命周期　304

#### 12.4　props与组件的被动更新　306

#### 12.5　setup函数的作用与实现　311

#### 12.6　组件事件与emit的实现　314

#### 12.7　插槽的工作原理与实现　316

#### 12.8　注册生命周期　318

#### 12.9　总结　320

### 第　13章 异步组件与函数式组件　322

#### 13.1　异步组件要解决的问题　322

#### 13.2　异步组件的实现原理　324

#### 13.2.1　封装defineAsyncComponent函数　324

#### 13.2.2　超时与Error组件　325

#### 13.2.3　延迟与Loading组件　328

###### 13.2.4　重试机制　331

###### 13.3　函数式组件　333

###### 13.4　总结　335

###### 第　14章 内建组件和模块　337

###### 14.1　KeepAlive组件的实现原理　337

###### 14.1.1　组件的激活与失活　337

###### 14.1.2　include和exclude　342

###### 14.1.3　缓存管理　343

###### 14.2　Teleport组件的实现原理　346

###### 14.2.1　Teleport组件要解决的问题　346

###### 14.2.2　实现Teleport组件　347

###### 14.3　Transition组件的实现原理　350

###### 14.3.1　原生DOM的过渡　351

###### 14.3.2　实现Transition组件　356

###### 14.4　总结　360

###### 第　15章 编译器核心技术概览　364

###### 15.1　模板DSL的编译器　364

###### 15.2　parser的实现原理与状态机　368

###### 15.3　构造AST　374

###### 15.4　AST的转换与插件化架构　383

###### 15.4.1　节点的访问　383

###### 15.4.2　转换上下文与节点操作　387

###### 15.4.3　进入与退出　392

###### 15.5　将模板AST转为JavaScript AST　396

###### 15.6　代码生成　402

###### 15.7　总结　407

###### 第　16章 解析器　409

###### 16.1　文本模式及其对解析器的影响　409

###### 16.2　递归下降算法构造模板AST　413

###### 16.3　状态机的开启与停止　419

###### 16.4　解析标签节点　426

###### 16.5　解析属性　430

###### 16.6　解析文本与解码HTML实体　436

###### 16.6.1　解析文本　436

###### 16.6.2　解码命名字符引用　438

###### 16.6.3　解码数字字符引用　445

###### 16.7　解析插值与注释　449

###### 16.8　总结　451

###### 第　17章 编译优化　453

###### 17.1　动态节点收集与补丁标志　453

###### 17.1.1　传统Diff算法的问题　453

###### 17.1.2　Block与PatchFlags　454

###### 17.1.3　收集动态节点　457

###### 17.1.4　渲染器的运行时支持　459

###### 17.2　Block树　461

###### 17.2.1　带有v-if指令的节点　462

###### 17.2.2　带有v-for指令的节点　464

###### 17.2.3　Fragment的稳定性　465

###### 17.3　静态提升　466

###### 17.4　预字符串化　468

###### 17.5　缓存内联事件处理函数　469

###### 17.6　v-once　470

###### 17.7　总结　471

###### 第　18章 同构渲染　474

###### 18.1　CSR、SSR以及同构渲染　474

###### 18.2　将虚拟DOM渲染为HTML字符串　478

###### 18.3　将组件渲染为HTML字符串　484

###### 18.4　客户端激活的原理　489

###### 18.5　编写同构的代码　494

###### 18.5.1　组件的生命周期　494

###### 18.5.2　使用跨平台的API　496

###### 18.5.3　只在某一端引入模块　496

###### 18.5.4　避免交叉请求引起的状态污染　497

###### 18.5.5　组件　498

###### 18.6　总结　499
