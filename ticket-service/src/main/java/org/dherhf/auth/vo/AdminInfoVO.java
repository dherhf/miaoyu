package org.dherhf.auth.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * 管理员信息视图对象。
 */
@Schema(description = "管理员信息")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminInfoVO {

    /** 管理员 ID */
    @Schema(description = "管理员ID")
    private Long id;

    /** 管理员姓名 */
    @Schema(description = "管理员姓名")
    private String name;

    /** 状态：1-正常,0-禁用 */
    @Schema(description = "状态：1-正常,0-禁用")
    private Integer status;
}
