package org.dherhf.auth.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("admin")
public class Admin {

    // 管理员 ID（雪花算法生成）
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    // 手机号
    private String phone;

    // 手机号 SHA-256 哈希值,用于唯一性校验和等值查询
    private String phoneHash;

    // 密码（Bcrypt）
    private String password;

    // 管理员姓名
    private String name;

    // 状态：1-正常,0-禁用
    private Integer status;

    // 逻辑删除标记：0-未删除,1-已删除
    @TableLogic
    private Integer deleted;

    // 创建时间
    private LocalDateTime createdAt;

    // 更新时间
    private LocalDateTime updatedAt;
}
