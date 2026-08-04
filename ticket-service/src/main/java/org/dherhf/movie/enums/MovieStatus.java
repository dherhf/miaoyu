package org.dherhf.movie.enums;

import lombok.Getter;

@Getter
public enum MovieStatus {
    OFFLINE(0, "下架"),
    ONLINE(1, "上架");

    private final int code;
    private final String desc;

    MovieStatus(int code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
