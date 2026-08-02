package org.dherhf.common;

import lombok.Data;

import java.util.List;

@Data
public class PageResult<T> {

    private Long total;
    private Integer page;
    private Integer size;
    private List<T> records;

    public PageResult(Long total, Integer page, Integer size, List<T> records) {
        this.total = total;
        this.page = page;
        this.size = size;
        this.records = records;
    }
}
