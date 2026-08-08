package org.dherhf.schedule.enums;

import lombok.Getter;

@Getter
public enum LanguageVersion {
    CHINESE_2D("chinese_2d", "国语2D"),
    CHINESE_3D("chinese_3d", "国语3D"),
    CHINESE_IMAX("chinese_imax", "国语IMAX"),
    ENGLISH_2D("english_2d", "英语2D"),
    ENGLISH_3D("english_3d", "英语3D"),
    ENGLISH_IMAX("english_imax", "英语IMAX");

    private final String code;
    private final String desc;

    LanguageVersion(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public static String getDescByCode(String code) {
        if (code == null) return null;
        for (LanguageVersion v : values()) {
            if (v.code.equals(code)) return v.desc;
        }
        return code;
    }
}
