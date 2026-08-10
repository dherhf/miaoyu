package org.dherhf.common.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dherhf.common.exception.BusinessException;
import org.dherhf.common.result.Result;
import org.dherhf.common.util.OssUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import java.util.Set;

/**
 * 文件上传控制器（管理端）。
 * <p>
 * 提供图片上传接口，将图片上传至 OSS 私有 Bucket 并返回 objectKey。
 * 上传前进行大小、类型和真实文件内容（magic byte）三重校验。
 */
@Slf4j
@Tag(name = "文件上传", description = "图片上传至 OSS")
@RestController
@RequestMapping("/api/v1/admin/upload")
@RequiredArgsConstructor
public class UploadController {

    private final OssUtil ossUtil;

    /** 允许上传的最大文件大小：10MB */
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    /** 允许上传的 Content-Type 白名单 */
    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"
    );

    /**
     * 图片格式的 magic byte 签名（文件头），用于校验真实文件类型，防止伪造 Content-Type。
     */
    private static final byte[] JPEG_MAGIC = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG_MAGIC = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] GIF_MAGIC_87 = {'G', 'I', 'F', '8', '7', 'a'};
    private static final byte[] GIF_MAGIC_89 = {'G', 'I', 'F', '8', '9', 'a'};
    private static final byte[] WEBP_MAGIC = {'R', 'I', 'F', 'F'};
    private static final byte[] BMP_MAGIC = {'B', 'M'};

    /**
     * 上传图片到 OSS。
     * <p>
     * 依次校验文件非空、大小不超限、Content-Type 在白名单内、
     * 真实文件内容与声明类型一致，通过后上传并返回 objectKey。
     *
     * @param file 待上传的图片文件
     * @return 包含 objectKey 的响应
     */
    @Operation(summary = "上传图片")
    @PostMapping("/image")
    public Result<Map<String, String>> uploadImage(@Parameter(description = "图片文件") @RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            throw new BusinessException(400, "请选择文件");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException(400, "文件大小不能超过 10MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new BusinessException(400, "仅支持 JPG/PNG/GIF/WebP/BMP 格式");
        }
        if (!isRealImage(file)) {
            throw new BusinessException(400, "文件内容与声明的类型不符");
        }
        String objectKey = ossUtil.uploadImage(file);
        return Result.success(Map.of("objectKey", objectKey));
    }

    /**
     * 读取文件头部字节，与已知图片格式的 magic byte 签名比对，校验文件真实类型。
     * Content-Type 头由客户端发送，可被伪造；magic byte 是文件本身的特征，无法伪造。
     *
     * @param file 待校验的图片文件
     * @return 文件真实类型是否与声明的 Content-Type 一致
     */
    private boolean isRealImage(MultipartFile file) {
        byte[] header;
        try (InputStream is = file.getInputStream()) {
            header = is.readNBytes(12);
        } catch (IOException e) {
            log.error("读取文件头失败", e);
            return false;
        }
        if (header.length < 3) {
            return false;
        }
        String ct = file.getContentType();
        if (ct != null) {
            return switch (ct) {
                case "image/jpeg" -> startsWith(header, JPEG_MAGIC);
                case "image/png" -> startsWith(header, PNG_MAGIC);
                case "image/gif" -> startsWith(header, GIF_MAGIC_87) || startsWith(header, GIF_MAGIC_89);
                case "image/webp" -> startsWith(header, WEBP_MAGIC);
                case "image/bmp" -> startsWith(header, BMP_MAGIC);
                default -> false;
            };
        } else {
            return false;
        }
    }

    /**
     * 判断字节数组是否以指定 magic byte 签名开头。
     *
     * @param data  待判断的数据字节
     * @param magic 目标 magic byte 签名
     * @return data 是否以 magic 开头
     */
    private boolean startsWith(byte[] data, byte[] magic) {
        if (data.length < magic.length) {
            return false;
        }
        for (int i = 0; i < magic.length; i++) {
            if (data[i] != magic[i]) {
                return false;
            }
        }
        return true;
    }
}