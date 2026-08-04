package org.dherhf.cinema.enums;

import lombok.Getter;

@Getter
public enum CinemaStatus {
    CLOSED(0, "停业"),
    OPEN(1, "营业");

    private final int code;
    private final String desc;

    CinemaStatus(int code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
