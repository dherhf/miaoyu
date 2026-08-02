package org.dherhf.cinema.dto;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HallUpdateDTO {

    private String name;

    private String screenType;

    private Integer status;
}
