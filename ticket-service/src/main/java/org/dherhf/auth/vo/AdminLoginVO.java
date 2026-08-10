package org.dherhf.auth.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * 管理员登录响应 DTO。
 */
@Schema(description = "管理员登录响应")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminLoginVO {

    /** JWT Token */
    @Schema(description = "JWT Token")
    private String token;

    /** 管理员信息 */
    @Schema(description = "管理员信息")
    private AdminInfoVO adminInfo;
}
