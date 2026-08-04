package org.dherhf.cinema.vo;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeatVO {

    private Long hallCellId;
    private Integer seatIndex;
    private Integer rowIndex;
    private Integer colIndex;
    private String seatLabel;
    private String seatCategory;
    private String status;
}
