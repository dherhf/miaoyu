package org.dherhf.cinema.vo;

import lombok.Data;

@Data
public class CellItemVO {

    private Integer rowIndex;
    private Integer colIndex;
    private String cellType;
    private String seatLabel;
    private String seatCategory;
    private String status;
}
