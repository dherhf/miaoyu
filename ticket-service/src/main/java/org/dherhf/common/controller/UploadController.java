package org.dherhf.common.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dherhf.common.exception.BusinessException;
import org.dherhf.common.result.Result;
import org.dherhf.common.util.OssUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import java.util.Set;

@Slf4j
@Tag(name = "文件上传", description = "图片上传至 OSS")
@RestController
@RequestMapping("/api/v1/admin/upload")
@RequiredArgsConstructor
public class UploadController {

    private final OssUtil ossUtil;

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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

    @Operation(summary = "上传图片")
    @PostMapping("/image")
    public Result<Map<String, String>> uploadImage(@RequestParam("file") MultipartFile file) {
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
