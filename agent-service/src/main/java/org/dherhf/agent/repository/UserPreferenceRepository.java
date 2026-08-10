package org.dherhf.agent.repository;

import org.dherhf.agent.document.UserPreferenceDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

/**
 * 用户偏好 MongoDB Repository。
 */
public interface UserPreferenceRepository extends MongoRepository<UserPreferenceDocument, String> {

    /**
     * 根据用户 ID 查询用户偏好文档。
     *
     * @param userId 用户 ID
     * @return 用户偏好文档（可能为空）
     */
    Optional<UserPreferenceDocument> findByUserId(Long userId);
}
