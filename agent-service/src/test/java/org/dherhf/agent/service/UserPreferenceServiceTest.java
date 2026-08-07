package org.dherhf.agent.service;

import org.dherhf.agent.common.TestConstants;
import org.dherhf.agent.document.UserPreferenceDocument;
import org.dherhf.agent.model.dto.PreferenceUpdateDTO;
import org.dherhf.agent.model.vo.PreferenceVO;
import org.dherhf.agent.repository.UserPreferenceRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserPreferenceService 用户偏好服务测试")
class UserPreferenceServiceTest {

    @Mock
    private UserPreferenceRepository repository;

    @InjectMocks
    private UserPreferenceService userPreferenceService;

    @Nested
    @DisplayName("getPreference 获取偏好文档")
    class GetPreferenceTest {

        @Test
        @DisplayName("不存在时返回空对象（仅含 userId）")
        void notFoundReturnsEmptyDoc() {
            when(repository.findByUserId(TestConstants.USER_ID)).thenReturn(Optional.empty());

            UserPreferenceDocument result = userPreferenceService.getPreference(TestConstants.USER_ID);

            assertThat(result).isNotNull();
            assertThat(result.getUserId()).isEqualTo(TestConstants.USER_ID);
            assertThat(result.getPreferredHallType()).isNull();
            assertThat(result.getPriceMin()).isNull();
            assertThat(result.getPriceMax()).isNull();
            assertThat(result.getPreferredSeatArea()).isNull();
            assertThat(result.getPreferredMovieTypes()).isNull();
        }

        @Test
        @DisplayName("存在时返回完整文档")
        void foundReturnsDoc() {
            UserPreferenceDocument doc = buildDoc(TestConstants.USER_ID, "IMAX",
                    new BigDecimal("30"), new BigDecimal("80"),
                    "5-8排中间", List.of("科幻", "喜剧"));
            when(repository.findByUserId(TestConstants.USER_ID)).thenReturn(Optional.of(doc));

            UserPreferenceDocument result = userPreferenceService.getPreference(TestConstants.USER_ID);

            assertThat(result.getPreferredHallType()).isEqualTo("IMAX");
            assertThat(result.getPriceMin()).isEqualByComparingTo("30");
            assertThat(result.getPriceMax()).isEqualByComparingTo("80");
            assertThat(result.getPreferredSeatArea()).isEqualTo("5-8排中间");
            assertThat(result.getPreferredMovieTypes()).containsExactly("科幻", "喜剧");
        }
    }

    @Nested
    @DisplayName("getPreferenceVO 获取偏好 VO")
    class GetPreferenceVOTest {

        @Test
        @DisplayName("不存在时返回空 VO")
        void notFoundReturnsEmptyVO() {
            when(repository.findByUserId(TestConstants.USER_ID)).thenReturn(Optional.empty());

            PreferenceVO vo = userPreferenceService.getPreferenceVO(TestConstants.USER_ID);

            assertThat(vo).isNotNull();
            assertThat(vo.getPreferredHallType()).isNull();
            assertThat(vo.getPreferredMovieTypes()).isNull();
            assertThat(vo.getUpdatedAt()).isNull();
        }

        @Test
        @DisplayName("存在时返回完整 VO（不含 id/userId）")
        void foundReturnsVO() {
            UserPreferenceDocument doc = buildDoc(TestConstants.USER_ID, "杜比",
                    new BigDecimal("50"), new BigDecimal("100"),
                    "3-5排中间", List.of("动作"));
            when(repository.findByUserId(TestConstants.USER_ID)).thenReturn(Optional.of(doc));

            PreferenceVO vo = userPreferenceService.getPreferenceVO(TestConstants.USER_ID);

            assertThat(vo.getPreferredHallType()).isEqualTo("杜比");
            assertThat(vo.getPriceMin()).isEqualByComparingTo("50");
            assertThat(vo.getPriceMax()).isEqualByComparingTo("100");
            assertThat(vo.getPreferredSeatArea()).isEqualTo("3-5排中间");
            assertThat(vo.getPreferredMovieTypes()).containsExactly("动作");
        }
    }

    @Nested
    @DisplayName("updatePreference 更新偏好")
    class UpdatePreferenceTest {

        @Test
        @DisplayName("首次创建（upsert）")
        void firstCreate() {
            when(repository.findByUserId(TestConstants.USER_ID)).thenReturn(Optional.empty());
            when(repository.save(any(UserPreferenceDocument.class))).thenAnswer(inv -> inv.getArgument(0));

            PreferenceUpdateDTO dto = PreferenceUpdateDTO.builder()
                    .preferredHallType("IMAX")
                    .priceMin(new BigDecimal("30"))
                    .priceMax(new BigDecimal("80"))
                    .preferredSeatArea("5-8排中间")
                    .preferredMovieTypes(List.of("科幻", "喜剧"))
                    .build();

            PreferenceVO result = userPreferenceService.updatePreference(TestConstants.USER_ID, dto);

            assertThat(result.getPreferredHallType()).isEqualTo("IMAX");
            assertThat(result.getPriceMin()).isEqualByComparingTo("30");
            assertThat(result.getPriceMax()).isEqualByComparingTo("80");

            ArgumentCaptor<UserPreferenceDocument> captor = ArgumentCaptor.forClass(UserPreferenceDocument.class);
            verify(repository).save(captor.capture());
            assertThat(captor.getValue().getUserId()).isEqualTo(TestConstants.USER_ID);
            assertThat(captor.getValue().getPreferredHallType()).isEqualTo("IMAX");
        }

        @Test
        @DisplayName("再次更新（覆盖已有数据）")
        void updateExisting() {
            UserPreferenceDocument existing = buildDoc(TestConstants.USER_ID, "IMAX",
                    new BigDecimal("30"), new BigDecimal("80"),
                    "5-8排中间", List.of("科幻"));
            when(repository.findByUserId(TestConstants.USER_ID)).thenReturn(Optional.of(existing));
            when(repository.save(any(UserPreferenceDocument.class))).thenAnswer(inv -> inv.getArgument(0));

            PreferenceUpdateDTO dto = PreferenceUpdateDTO.builder()
                    .preferredHallType("杜比")
                    .priceMin(new BigDecimal("50"))
                    .priceMax(new BigDecimal("120"))
                    .preferredSeatArea("3-5排中间")
                    .preferredMovieTypes(List.of("动作", "战争"))
                    .build();

            PreferenceVO result = userPreferenceService.updatePreference(TestConstants.USER_ID, dto);

            assertThat(result.getPreferredHallType()).isEqualTo("杜比");
            assertThat(result.getPriceMin()).isEqualByComparingTo("50");
            assertThat(result.getPriceMax()).isEqualByComparingTo("120");
            assertThat(result.getPreferredSeatArea()).isEqualTo("3-5排中间");
            assertThat(result.getPreferredMovieTypes()).containsExactly("动作", "战争");

            // 验证复用了已有文档（同一对象）
            ArgumentCaptor<UserPreferenceDocument> captor = ArgumentCaptor.forClass(UserPreferenceDocument.class);
            verify(repository).save(captor.capture());
            assertThat(captor.getValue()).isSameAs(existing);
            assertThat(captor.getValue().getPreferredHallType()).isEqualTo("杜比");
        }
    }

    private UserPreferenceDocument buildDoc(Long userId, String hallType,
                                            BigDecimal priceMin, BigDecimal priceMax,
                                            String seatArea, List<String> movieTypes) {
        UserPreferenceDocument doc = new UserPreferenceDocument();
        doc.setUserId(userId);
        doc.setPreferredHallType(hallType);
        doc.setPriceMin(priceMin);
        doc.setPriceMax(priceMax);
        doc.setPreferredSeatArea(seatArea);
        doc.setPreferredMovieTypes(movieTypes);
        return doc;
    }
}
