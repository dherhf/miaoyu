package org.dherhf.agent.service;

import lombok.RequiredArgsConstructor;
import org.dherhf.agent.document.UserPreferenceDocument;
import org.dherhf.agent.model.dto.PreferenceUpdateDTO;
import org.dherhf.agent.model.vo.PreferenceVO;
import org.dherhf.agent.repository.UserPreferenceRepository;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserPreferenceService {

    private final UserPreferenceRepository repository;

    /**
     * 获取偏好文档（不存在时返回空对象）。
     * 供 DialogueService 注入 LLM 上下文使用。
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
     */
    public PreferenceVO getPreferenceVO(Long userId) {
        return toVO(getPreference(userId));
    }

    /**
     * 更新偏好（upsert）。updatedAt 由 @LastModifiedDate 自动管理。
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
