package org.dherhf.cinema.dto;

import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CinemaUpdateDTO {

    @NotBlank(message = "影院名称不能为空")
    @Size(min = 1, max = 50, message = "影院名称长度1-50字符")
    private String name;

    @NotBlank(message = "影院地址不能为空")
    @Size(min = 1, max = 200, message = "影院地址长度1-200字符")
    private String address;

    @NotNull(message = "经度不能为空")
    private BigDecimal longitude;

    @NotNull(message = "纬度不能为空")
    private BigDecimal latitude;

    private List<String> facilities;

    private BigDecimal rating;

    private String phone;
}
