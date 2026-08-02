package org.dherhf.common.interceptor;

import org.dherhf.common.util.JwtUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthInterceptor 认证拦截器测试")
class AuthInterceptorTest {

    @Mock
    private JwtUtil jwtUtil;

    @InjectMocks
    private AuthInterceptor authInterceptor;

    private MockHttpServletRequest buildRequest(String method, String uri, String authHeader) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod(method);
        request.setRequestURI(uri);
        if (authHeader != null) {
            request.addHeader("Authorization", authHeader);
        }
        return request;
    }

    @Nested
    @DisplayName("OPTIONS 预检")
    class OptionsTest {

        @Test
        @DisplayName("OPTIONS 请求直接放行")
        void shouldPassOptionsRequest() throws Exception {
            MockHttpServletRequest request = buildRequest("OPTIONS", "/api/v1/auth/me", null);
            MockHttpServletResponse response = new MockHttpServletResponse();

            boolean result = authInterceptor.preHandle(request, response, new Object());

            assertThat(result).isTrue();
        }
    }

    @Nested
    @DisplayName("缺少认证信息")
    class MissingAuthTest {

        @Test
        @DisplayName("无 Authorization 头返回 401")
        void shouldRejectWithoutAuthHeader() throws Exception {
            MockHttpServletRequest request = buildRequest("GET", "/api/v1/auth/me", null);
            MockHttpServletResponse response = new MockHttpServletResponse();

            boolean result = authInterceptor.preHandle(request, response, new Object());

            assertThat(result).isFalse();
            assertThat(response.getStatus()).isEqualTo(401);
            assertThat(response.getContentAsString()).contains("未提供认证token");
        }

        @Test
        @DisplayName("Authorization 格式错误返回 401")
        void shouldRejectWrongAuthFormat() throws Exception {
            MockHttpServletRequest request = buildRequest("GET", "/api/v1/auth/me", "Basic abc123");
            MockHttpServletResponse response = new MockHttpServletResponse();

            boolean result = authInterceptor.preHandle(request, response, new Object());

            assertThat(result).isFalse();
            assertThat(response.getStatus()).isEqualTo(401);
        }
    }

    @Nested
    @DisplayName("无效 Token")
    class InvalidTokenTest {

        @Test
        @DisplayName("无效 Token 返回 401")
        void shouldRejectInvalidToken() throws Exception {
            String token = "invalid-token";
            MockHttpServletRequest request = buildRequest("GET", "/api/v1/auth/me", "Bearer " + token);
            MockHttpServletResponse response = new MockHttpServletResponse();

            when(jwtUtil.isTokenValid(token)).thenReturn(false);

            boolean result = authInterceptor.preHandle(request, response, new Object());

            assertThat(result).isFalse();
            assertThat(response.getStatus()).isEqualTo(401);
            assertThat(response.getContentAsString()).contains("token无效或已过期");
        }
    }

    @Nested
    @DisplayName("有效 Token")
    class ValidTokenTest {

        @Test
        @DisplayName("用户 Token 访问用户路径放行并注入 userId")
        void shouldPassUserTokenOnUserPath() throws Exception {
            String token = "valid-user-token";
            MockHttpServletRequest request = buildRequest("GET", "/api/v1/auth/me", "Bearer " + token);
            MockHttpServletResponse response = new MockHttpServletResponse();

            when(jwtUtil.isTokenValid(token)).thenReturn(true);
            when(jwtUtil.getUserId(token)).thenReturn(1L);
            when(jwtUtil.getType(token)).thenReturn("user");

            boolean result = authInterceptor.preHandle(request, response, new Object());

            assertThat(result).isTrue();
            assertThat(request.getAttribute("userId")).isEqualTo(1L);
            assertThat(request.getAttribute("type")).isEqualTo("user");
        }

        @Test
        @DisplayName("管理员 Token 访问管理路径放行并注入 userId")
        void shouldPassAdminTokenOnAdminPath() throws Exception {
            String token = "valid-admin-token";
            MockHttpServletRequest request = buildRequest("GET", "/api/v1/admin/auth/me", "Bearer " + token);
            MockHttpServletResponse response = new MockHttpServletResponse();

            when(jwtUtil.isTokenValid(token)).thenReturn(true);
            when(jwtUtil.getUserId(token)).thenReturn(1L);
            when(jwtUtil.getType(token)).thenReturn("admin");

            boolean result = authInterceptor.preHandle(request, response, new Object());

            assertThat(result).isTrue();
            assertThat(request.getAttribute("userId")).isEqualTo(1L);
            assertThat(request.getAttribute("type")).isEqualTo("admin");
        }
    }

    @Nested
    @DisplayName("路径类型不匹配")
    class PathMismatchTest {

        @Test
        @DisplayName("用户 Token 访问管理路径返回 401")
        void shouldRejectUserTokenOnAdminPath() throws Exception {
            String token = "valid-user-token";
            MockHttpServletRequest request = buildRequest("GET", "/api/v1/admin/auth/me", "Bearer " + token);
            MockHttpServletResponse response = new MockHttpServletResponse();

            when(jwtUtil.isTokenValid(token)).thenReturn(true);
            when(jwtUtil.getUserId(token)).thenReturn(1L);
            when(jwtUtil.getType(token)).thenReturn("user");

            boolean result = authInterceptor.preHandle(request, response, new Object());

            assertThat(result).isFalse();
            assertThat(response.getStatus()).isEqualTo(401);
            assertThat(response.getContentAsString()).contains("无管理员权限");
        }

        @Test
        @DisplayName("管理员 Token 访问用户路径返回 401")
        void shouldRejectAdminTokenOnUserPath() throws Exception {
            String token = "valid-admin-token";
            MockHttpServletRequest request = buildRequest("GET", "/api/v1/auth/me", "Bearer " + token);
            MockHttpServletResponse response = new MockHttpServletResponse();

            when(jwtUtil.isTokenValid(token)).thenReturn(true);
            when(jwtUtil.getUserId(token)).thenReturn(1L);
            when(jwtUtil.getType(token)).thenReturn("admin");

            boolean result = authInterceptor.preHandle(request, response, new Object());

            assertThat(result).isFalse();
            assertThat(response.getStatus()).isEqualTo(401);
            assertThat(response.getContentAsString()).contains("Token类型不匹配");
        }
    }
}
