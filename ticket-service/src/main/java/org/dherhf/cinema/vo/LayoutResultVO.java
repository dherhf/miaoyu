package org.dherhf.cinema.vo;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LayoutResultVO {

    private Long hallId;
    private Long totalSeats;
    private LocalDateTime updatedAt;
}
