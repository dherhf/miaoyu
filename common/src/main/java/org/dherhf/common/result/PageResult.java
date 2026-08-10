package org.dherhf.common.result;

import lombok.Data;

import java.util.List;

/**
 * 分页查询结果封装。
 * <p>
 * 携带总记录数、当前页码、每页大小和当前页数据列表，
 * 用于统一分页接口的返回格式。
 *
 * @param <T> 记录数据类型
 */
@Data
public class PageResult<T> {

    private Long total;
    private Integer page;
    private Integer size;
    private List<T> records;

    /**
     * 构造分页结果。
     *
     * @param total   符合查询条件的总记录数
     * @param page    当前页码（从 1 开始）
     * @param size    每页记录数
     * @param records 当前页的数据列表
     */
    public PageResult(Long total, Integer page, Integer size, List<T> records) {
        this.total = total;
        this.page = page;
        this.size = size;
        this.records = records;
    }
}
