package org.dherhf.auth.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

/**
 * 用户信息视图对象,手机号已脱敏。
 */
@Schema(description = "用户信息")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserInfoVO {

    /** 用户 ID */
    @Schema(description = "用户ID")
    private Long id;

    /** 手机号（脱敏,如 {@code 138****8888}） */
    @Schema(description = "手机号（脱敏）")
    private String phone;

    /** 昵称 */
    @Schema(description = "昵称")
    private String nickname;

    /** 状态：1-正常,0-禁用 */
    @Schema(description = "状态：1-正常,0-禁用")
    private Integer status;

    /** 创建时间 */
    @Schema(description = "创建时间")
    private LocalDateTime createdAt;
}
