package org.dherhf.vo;

import lombok.Data;

@Data
public class SeatVO {

    private Integer seatIndex;
    private Integer rowIndex;
    private Integer colIndex;
    private String seatLabel;
    private String seatCategory;
    private String status;
}
