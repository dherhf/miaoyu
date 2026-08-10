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

/**
 * 阿里云 OSS 工具类。
 * <p>
 * 封装 OSS 私有 Bucket 的图片上传和签名 URL 生成功能。
 * 图片按日期目录存储，使用 UUID 防止文件名冲突。
 */
@Slf4j
@Component
public class OssUtil {

    private final OSS ossClient;
    private final String bucketName;

    /**
     * 构造 OSS 客户端，从配置读取 endpoint、bucket 和 AK/SK。
     *
     * @param endpoint          OSS 服务端点
     * @param bucketName        OSS Bucket 名称
     * @param accessKeyId       阿里云 AccessKey ID
     * @param accessKeySecret   阿里云 AccessKey Secret
     */
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
     * <p>
     * 文件按日期目录存储，使用 UUID 生成唯一文件名。
     *
     * @param file 待上传的图片文件
     * @return OSS 中的 objectKey
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
     * <p>
     * 如果 objectKey 为空或已是完整 URL（http 开头）则直接返回原值。
     *
     * @param objectKey     OSS 对象 key
     * @param expireSeconds 签名 URL 有效期（秒）
     * @return 带签名的临时访问 URL
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

    /**
     * 应用关闭时释放 OSS 客户端资源。
     */
    @PreDestroy
    public void destroy() {
        ossClient.shutdown();
        log.info("OSS client shutdown");
    }
}