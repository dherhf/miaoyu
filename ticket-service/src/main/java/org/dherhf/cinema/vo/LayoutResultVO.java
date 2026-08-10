package org.dherhf.cinema.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Schema(description = "布局结果")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LayoutResultVO {

    @Schema(description = "影厅ID")
    private Long hallId;

    @Schema(description = "总座位数")
    private Long totalSeats;

    @Schema(description = "更新时间")
    private LocalDateTime updatedAt;
}
