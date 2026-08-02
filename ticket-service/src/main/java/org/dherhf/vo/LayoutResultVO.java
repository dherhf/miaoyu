package org.dherhf.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class LayoutResultVO {

    private Long hallId;
    private Long totalSeats;
    private LocalDateTime updatedAt;
}
