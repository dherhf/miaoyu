package org.dherhf.auth.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * 图形验证码视图对象。
 */
@Schema(description = "图形验证码")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CaptchaVO {

    /** 验证码唯一标识（UUID） */
    @Schema(description = "验证码唯一标识（UUID）")
    private String captchaId;

    /** Base64 编码的验证码图片，格式 {@code data:image/png;base64,...} */
    @Schema(description = "Base64编码的验证码图片")
    private String image;
}
