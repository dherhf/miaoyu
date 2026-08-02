package org.dherhf.auth.service;

import org.dherhf.auth.vo.AdminInfoVO;
import org.dherhf.auth.vo.AdminLoginVO;
import org.dherhf.auth.dto.LoginDTO;
import org.dherhf.common.exception.BusinessException;
import org.dherhf.common.result.Result;
import org.dherhf.auth.entity.Admin;
import org.dherhf.common.util.CryptoUtil;
import org.dherhf.auth.mapper.AdminMapper;
import org.dherhf.common.util.JwtUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("管理员认证服务测试")
class AdminAuthServiceTest {

    @Mock
    private AdminMapper adminMapper;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private AuthHelper authHelper;

    @InjectMocks
    private AdminAuthService adminAuthService;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private static final String PHONE = "13800138000";
    private static final String PASSWORD = "password123";

    private Admin createAdmin() {
        Admin admin = new Admin();
        admin.setId(1L);
        admin.setName("管理员");
        admin.setPhoneHash(CryptoUtil.sha256(PHONE));
        admin.setPassword(passwordEncoder.encode(PASSWORD));
        admin.setStatus(1);
        return admin;
    }

    @Nested
    @DisplayName("login")
    class LoginTest {

        @Test
        @DisplayName("登录成功返回 Token 和管理员信息")
        void shouldLoginSuccessfully() {
            LoginDTO request = new LoginDTO();
            request.setPhone(PHONE);
            request.setPassword(PASSWORD);

            Admin admin = createAdmin();

            when(authHelper.isAccountLocked(anyString())).thenReturn(false);
            when(adminMapper.selectOne(any())).thenReturn(admin);
            when(jwtUtil.generateToken(1L, "admin")).thenReturn("mock-admin-token");

            Result<AdminLoginVO> result = adminAuthService.login(request);

            assertThat(result.getCode()).isEqualTo(0);
            AdminLoginVO response = result.getData();
            assertThat(response.getToken()).isEqualTo("mock-admin-token");
            assertThat(response.getAdminInfo().getId()).isEqualTo(1L);
            assertThat(response.getAdminInfo().getName()).isEqualTo("管理员");
            verify(authHelper).clearLoginFailure(anyString());
        }

        @Test
        @DisplayName("账号锁定抛出 403")
        void shouldThrow403WhenAccountLocked() {
            LoginDTO request = new LoginDTO();
            request.setPhone(PHONE);
            request.setPassword(PASSWORD);

            when(authHelper.isAccountLocked(anyString())).thenReturn(true);

            assertThatThrownBy(() -> adminAuthService.login(request))
                    .isInstanceOf(BusinessException.class)
                    .satisfies(e -> {
                        BusinessException be = (BusinessException) e;
                        assertThat(be.getCode()).isEqualTo(403);
                    });
        }

        @Test
        @DisplayName("管理员不存在抛出 401")
        void shouldThrow401WhenAdminNotFound() {
            LoginDTO request = new LoginDTO();
            request.setPhone(PHONE);
            request.setPassword(PASSWORD);

            when(authHelper.isAccountLocked(anyString())).thenReturn(false);
            when(adminMapper.selectOne(any())).thenReturn(null);

            assertThatThrownBy(() -> adminAuthService.login(request))
                    .isInstanceOf(BusinessException.class)
                    .satisfies(e -> {
                        BusinessException be = (BusinessException) e;
                        assertThat(be.getCode()).isEqualTo(401);
                    });
            verify(authHelper).recordLoginFailure(anyString(), anyString());
        }

        @Test
        @DisplayName("管理员被禁用抛出 401")
        void shouldThrow401WhenAdminDisabled() {
            LoginDTO request = new LoginDTO();
            request.setPhone(PHONE);
            request.setPassword(PASSWORD);

            Admin admin = createAdmin();
            admin.setStatus(0);

            when(authHelper.isAccountLocked(anyString())).thenReturn(false);
            when(adminMapper.selectOne(any())).thenReturn(admin);

            assertThatThrownBy(() -> adminAuthService.login(request))
                    .isInstanceOf(BusinessException.class)
                    .satisfies(e -> {
                        BusinessException be = (BusinessException) e;
                        assertThat(be.getCode()).isEqualTo(401);
                    });
            verify(authHelper).recordLoginFailure(anyString(), anyString());
        }

        @Test
        @DisplayName("密码错误抛出 401")
        void shouldThrow401WhenPasswordWrong() {
            LoginDTO request = new LoginDTO();
            request.setPhone(PHONE);
            request.setPassword("wrong-password");

            Admin admin = createAdmin();

            when(authHelper.isAccountLocked(anyString())).thenReturn(false);
            when(adminMapper.selectOne(any())).thenReturn(admin);

            assertThatThrownBy(() -> adminAuthService.login(request))
                    .isInstanceOf(BusinessException.class)
                    .satisfies(e -> {
                        BusinessException be = (BusinessException) e;
                        assertThat(be.getCode()).isEqualTo(401);
                    });
            verify(authHelper).recordLoginFailure(anyString(), anyString());
        }
    }

    @Nested
    @DisplayName("getCurrentAdmin")
    class GetCurrentAdminTest {

        @Test
        @DisplayName("返回当前管理员信息")
        void shouldReturnAdminInfo() {
            Admin admin = createAdmin();

            when(adminMapper.selectById(1L)).thenReturn(admin);

            Result<AdminInfoVO> result = adminAuthService.getCurrentAdmin(1L);

            assertThat(result.getCode()).isEqualTo(0);
            AdminInfoVO vo = result.getData();
            assertThat(vo.getId()).isEqualTo(1L);
            assertThat(vo.getName()).isEqualTo("管理员");
            assertThat(vo.getStatus()).isEqualTo(1);
        }

        @Test
        @DisplayName("管理员不存在抛出 404")
        void shouldThrow404WhenAdminNotFound() {
            when(adminMapper.selectById(999L)).thenReturn(null);

            assertThatThrownBy(() -> adminAuthService.getCurrentAdmin(999L))
                    .isInstanceOf(BusinessException.class)
                    .satisfies(e -> {
                        BusinessException be = (BusinessException) e;
                        assertThat(be.getCode()).isEqualTo(404);
                    });
        }
    }
}
