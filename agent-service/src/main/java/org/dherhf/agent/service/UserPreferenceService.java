package org.dherhf.agent.service;

import lombok.RequiredArgsConstructor;
import org.dherhf.agent.document.UserPreferenceDocument;
import org.dherhf.agent.model.dto.PreferenceUpdateDTO;
import org.dherhf.agent.model.vo.PreferenceVO;
import org.dherhf.agent.repository.UserPreferenceRepository;
import org.springframework.stereotype.Service;

/**
 * 用户偏好管理服务。
 * <p>
 * 封装用户偏好的查询、全量更新和部分合并操作，供 ChatService 和 Controller 调用。
 * 偏好数据存储在 MongoDB 中，通过 {@link UserPreferenceRepository} 访问。
 * </p>
 */
@Service
@RequiredArgsConstructor
public class UserPreferenceService {

    private final UserPreferenceRepository repository;

    /**
     * 获取偏好文档（不存在时返回空对象）。
     * 供 ChatService 注入 LLM 上下文使用。
     *
     * @param userId 用户 ID
     * @return 用户偏好文档；不存在时返回仅含 userId 的空文档
     */
    public UserPreferenceDocument getPreference(Long userId) {
        return repository.findByUserId(userId).orElseGet(() -> {
            UserPreferenceDocument doc = new UserPreferenceDocument();
            doc.setUserId(userId);
            return doc;
        });
    }

    /**
     * 获取偏好 VO（供 Controller 返回）。
     *
     * @param userId 用户 ID
     * @return 偏好 VO 对象
     */
    public PreferenceVO getPreferenceVO(Long userId) {
        return toVO(getPreference(userId));
    }

    /**
     * 更新偏好（全量覆盖）。updatedAt 由 @LastModifiedDate 自动管理。
     *
     * @param userId 用户 ID
     * @param dto    偏好更新 DTO（全量覆盖）
     * @return 更新后的偏好 VO
     */
    public PreferenceVO updatePreference(Long userId, PreferenceUpdateDTO dto) {
        UserPreferenceDocument doc = repository.findByUserId(userId).orElseGet(() -> {
            UserPreferenceDocument d = new UserPreferenceDocument();
            d.setUserId(userId);
            return d;
        });
        doc.setPreferredHallType(dto.getPreferredHallType());
        doc.setPriceMin(dto.getPriceMin());
        doc.setPriceMax(dto.getPriceMax());
        doc.setPreferredSeatArea(dto.getPreferredSeatArea());
        doc.setPreferredMovieTypes(dto.getPreferredMovieTypes());
        UserPreferenceDocument saved = repository.save(doc);
        return toVO(saved);
    }

    /**
     * 合并偏好（部分更新，仅覆盖非 null 字段）。
     * 供 ChatService 从对话中自动提取偏好时使用。
     *
     * @param userId 用户 ID
     * @param dto    偏好更新 DTO（仅非 null 字段生效）
     */
    public void mergePreference(Long userId, PreferenceUpdateDTO dto) {
        UserPreferenceDocument doc = repository.findByUserId(userId).orElseGet(() -> {
            UserPreferenceDocument d = new UserPreferenceDocument();
            d.setUserId(userId);
            return d;
        });
        if (dto.getPreferredHallType() != null) {
            doc.setPreferredHallType(dto.getPreferredHallType());
        }
        if (dto.getPriceMin() != null) {
            doc.setPriceMin(dto.getPriceMin());
        }
        if (dto.getPriceMax() != null) {
            doc.setPriceMax(dto.getPriceMax());
        }
        if (dto.getPreferredSeatArea() != null) {
            doc.setPreferredSeatArea(dto.getPreferredSeatArea());
        }
        if (dto.getPreferredMovieTypes() != null) {
            doc.setPreferredMovieTypes(dto.getPreferredMovieTypes());
        }
        repository.save(doc);
    }

    /**
     * 将偏好文档转换为偏好 VO 对象。
     *
     * @param doc 用户偏好文档
     * @return 偏好 VO 对象
     */
    private PreferenceVO toVO(UserPreferenceDocument doc) {
        PreferenceVO vo = new PreferenceVO();
        vo.setPreferredHallType(doc.getPreferredHallType());
        vo.setPriceMin(doc.getPriceMin());
        vo.setPriceMax(doc.getPriceMax());
        vo.setPreferredSeatArea(doc.getPreferredSeatArea());
        vo.setPreferredMovieTypes(doc.getPreferredMovieTypes());
        vo.setUpdatedAt(doc.getUpdatedAt());
        return vo;
    }
}
