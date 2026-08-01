# 实体类字段注释规范

实体类（Entity）的字段注释使用行内 `//` 风格,不使用 Javadoc `/** */`。

## 规则

- 正确：`// 用户ID`
- 错误：`/** 用户ID */`

## 示例

```java
public class User {

    // 用户ID
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    // 手机号
    private String phone;

    // 状态
    private Integer status;
}
```

## 适用范围

仅实体类（`@TableName` 标注的类）。其他类（Service、Controller、Util 等）仍使用 Javadoc 风格。
