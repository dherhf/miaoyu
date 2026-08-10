package org.dherhf.common.util;

/**
 * 分页参数校正工具，统一 clamp page/size 防止越界查询。
 */
public final class PageUtil {

    private static final int DEFAULT_PAGE = 1;
    private static final int DEFAULT_SIZE = 20;
    private static final int MAX_SIZE = 100;

    private PageUtil() {}

    /**
     * 校正页码：null/<=0 → 1。
     */
    public static int normalizePage(Integer page) {
        if (page == null || page < 1) return DEFAULT_PAGE;
        return page;
    }

    /**
     * 校正每页大小：null/<1 → 20，>100 → 100。
     */
    public static int normalizeSize(Integer size) {
        if (size == null || size < 1) return DEFAULT_SIZE;
        return Math.min(size, MAX_SIZE);
    }
}
