package org.dherhf.common.util;

import com.aliyun.oss.OSS;
import com.aliyun.oss.OSSClientBuilder;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URL;
import java.time.LocalDate;
import java.util.Date;
import java.util.UUID;

@Slf4j
@Component
public class OssUtil {

    private final OSS ossClient;
    private final String bucketName;

    public OssUtil(
            @Value("${oss.endpoint}") String endpoint,
            @Value("${oss.bucket-name}") String bucketName,
            @Value("${oss.access-key-id}") String accessKeyId,
            @Value("${oss.access-key-secret}") String accessKeySecret
    ) {
        this.bucketName = bucketName;
        this.ossClient = new OSSClientBuilder().build(endpoint, accessKeyId, accessKeySecret);
        log.info("OSS client initialized: bucket={}", bucketName);
    }

    /**
     * 上传图片到私有 Bucket，返回 objectKey（存入数据库）。
     * 读取时通过 generateSignedUrl 动态生成签名 URL。
     */
    public String uploadImage(MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        String ext = "jpg";
        if (originalFilename != null && originalFilename.contains(".")) {
            ext = originalFilename.substring(originalFilename.lastIndexOf('.') + 1).toLowerCase();
        }

        String datePath = LocalDate.now().toString();
        String objectKey = "poster/" + datePath + "/" + UUID.randomUUID().toString().replace("-", "") + "." + ext;

        try {
            ossClient.putObject(bucketName, objectKey, file.getInputStream());
            log.info("Uploaded image to OSS: objectKey={}, size={}bytes", objectKey, file.getSize());
            return objectKey;
        } catch (IOException e) {
            log.error("Failed to upload image to OSS: originalFilename={}, size={}", originalFilename, file.getSize(), e);
            throw new RuntimeException("图片上传失败", e);
        }
    }

    /**
     * 为私有 Bucket 中的对象生成带签名的临时访问 URL。
     */
    public String generateSignedUrl(String objectKey, long expireSeconds) {
        if (objectKey == null || objectKey.isBlank()) {
            return objectKey;
        }
        if (objectKey.startsWith("http")) {
            return objectKey;
        }
        Date expiration = new Date(System.currentTimeMillis() + expireSeconds * 1000);
        URL url = ossClient.generatePresignedUrl(bucketName, objectKey, expiration);
        return url.toString();
    }

    @PreDestroy
    public void destroy() {
        ossClient.shutdown();
        log.info("OSS client shutdown");
    }
}

