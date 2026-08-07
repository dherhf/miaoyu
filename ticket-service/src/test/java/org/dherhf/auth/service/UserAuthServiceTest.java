package org.dherhf.auth.service;

import org.dherhf.auth.dto.LoginDTO;
import org.dherhf.auth.vo.LoginVO;
import org.dherhf.auth.dto.RegisterDTO;
import org.dherhf.auth.dto.ResetPasswordDTO;
import org.dherhf.auth.vo.UserInfoVO;
import org.dherhf.common.exception.BusinessException;
import org.dherhf.auth.entity.User;
import org.dherhf.auth.mapper.UserMapper;
import org.dherhf.common.util.CryptoUtil;
import org.dherhf.common.util.JwtUtil;
import org.junit.jupiter.api.BeforeAll;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("用户认证服务测试")
class UserAuthServiceTest {

    @Mock
    private UserMapper userMapper;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private AuthHelper authHelper;

    @Mock
    private SmsService smsService;

    @InjectMocks
    private UserAuthService userAuthService;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private static final String PHONE = "13800138000";
    private static final String PASSWORD = "password123";
    private static final String SMS_CODE = "123456";
    private static final String NEW_PASSWORD = "newpassword456";

    @BeforeAll
    static void setUpCrypto() {
        String aesKey = CryptoUtil.generateAes256Key();
        new CryptoUtil().setDefaultAesBase64Key(aesKey);
    }

    private User createUser() {
        return User.builder()
                .id(1L)
                .phone(CryptoUtil.encrypt(PHONE))
                .phoneHash(CryptoUtil.sha256(PHONE))
                .password(passwordEncoder.encode(PASSWORD))
                .nickname("用户8000")
                .status(1)
                .build();
    }

    @Nested
    @DisplayName("register")
    class RegisterTest {

        @Test
        @DisplayName("注册成功返回脱敏用户信息")
        void shouldRegisterSuccessfully() {
            RegisterDTO request = RegisterDTO.builder()
                    .phone(PHONE).password(PASSWORD)
                    .smsCode(SMS_CODE)
                    .build();

            when(smsService.checkVerifyCode(PHONE, SMS_CODE)).thenReturn(true);
            when(userMapper.selectCount(any())).thenReturn(0L);
            when(authHelper.maskPhone(PHONE)).thenReturn("138****8000");

            UserInfoVO vo = userAuthService.register(request);

            assertThat(vo.getPhone()).isEqualTo("138****8000");
            assertThat(vo.getNickname()).isEqualTo("用户8000");
            assertThat(vo.getStatus()).isEqualTo(1);
            verify(smsService).checkVerifyCode(PHONE, SMS_CODE);
        }

        @Test
        @DisplayName("短信验证码错误抛出 400")
        void shouldThrow400WhenSmsCodeInvalid() {
            RegisterDTO request = RegisterDTO.builder()
                    .phone(PHONE).password(PASSWORD)
                    .smsCode("wrong")
                    .build();

            when(smsService.checkVerifyCode(PHONE, "wrong")).thenReturn(false);

            assertThatThrownBy(() -> userAuthService.register(request))
                    .isInstanceOf(BusinessException.class)
                    .satisfies(e -> {
                        BusinessException be = (BusinessException) e;
                        assertThat(be.getCode()).isEqualTo(400);
                        assertThat(be.getMessage()).isEqualTo("短信验证码错误或已过期");
                    });
        }

        @Test
        @DisplayName("手机号已注册抛出 409")
        void shouldThrow409WhenPhoneAlreadyRegistered() {
            RegisterDTO request = RegisterDTO.builder()
                    .phone(PHONE).password(PASSWORD)
                    .smsCode(SMS_CODE)
                    .build();

            when(smsService.checkVerifyCode(PHONE, SMS_CODE)).thenReturn(true);
            when(userMapper.selectCount(any())).thenReturn(1L);

            assertThatThrownBy(() -> userAuthService.register(request))
                    .isInstanceOf(BusinessException.class)
                    .satisfies(e -> {
                        BusinessException be = (BusinessException) e;
                        assertThat(be.getCode()).isEqualTo(409);
                        assertThat(be.getMessage()).isEqualTo("该手机号已注册");
                    });
        }
    }

    @Nested
    @DisplayName("login")
    class LoginTest {

        @Test
        @DisplayName("登录成功返回 Token 和用户信息")
        void shouldLoginSuccessfully() {
            LoginDTO request = LoginDTO.builder().phone(PHONE).password(PASSWORD).build();

            User user = createUser();

            when(authHelper.isAccountLocked(anyString())).thenReturn(false);
            when(userMapper.selectOne(any())).thenReturn(user);
            when(jwtUtil.generateToken(1L, "user")).thenReturn("mock-token");
            when(authHelper.maskPhone(PHONE)).thenReturn("138****8000");

            LoginVO response = userAuthService.login(request);

            assertThat(response.getToken()).isEqualTo("mock-token");
            assertThat(response.getUserInfo().getId()).isEqualTo(1L);
            assertThat(response.getUserInfo().getPhone()).isEqualTo("138****8000");
            verify(authHelper).clearLoginFailure(anyString());
        }

        @Test
        @DisplayName("账号锁定抛出 403")
        void shouldThrow403WhenAccountLocked() {
            LoginDTO request = LoginDTO.builder().phone(PHONE).password(PASSWORD).build();

            when(authHelper.isAccountLocked(anyString())).thenReturn(true);

            assertThatThrownBy(() -> userAuthService.login(request))
                    .isInstanceOf(BusinessException.class)
                    .satisfies(e -> {
                        BusinessException be = (BusinessException) e;
                        assertThat(be.getCode()).isEqualTo(403);
                    });
        }

        @Test
        @DisplayName("用户不存在抛出 401")
        void shouldThrow401WhenUserNotFound() {
            LoginDTO request = LoginDTO.builder().phone(PHONE).password(PASSWORD).build();

            when(authHelper.isAccountLocked(anyString())).thenReturn(false);
            when(userMapper.selectOne(any())).thenReturn(null);

            assertThatThrownBy(() -> userAuthService.login(request))
                    .isInstanceOf(BusinessException.class)
                    .satisfies(e -> {
                        BusinessException be = (BusinessException) e;
                        assertThat(be.getCode()).isEqualTo(401);
                    });
            verify(authHelper).recordLoginFailure(anyString(), anyString());
        }

        @Test
        @DisplayName("用户被禁用抛出 401")
        void shouldThrow401WhenUserDisabled() {
            LoginDTO request = LoginDTO.builder().phone(PHONE).password(PASSWORD).build();

            User user = createUser();
            user.setStatus(0);

            when(authHelper.isAccountLocked(anyString())).thenReturn(false);
            when(userMapper.selectOne(any())).thenReturn(user);

            assertThatThrownBy(() -> userAuthService.login(request))
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
            LoginDTO request = LoginDTO.builder().phone(PHONE).password("wrong-password").build();

            User user = createUser();

            when(authHelper.isAccountLocked(anyString())).thenReturn(false);
            when(userMapper.selectOne(any())).thenReturn(user);

            assertThatThrownBy(() -> userAuthService.login(request))
                    .isInstanceOf(BusinessException.class)
                    .satisfies(e -> {
                        BusinessException be = (BusinessException) e;
                        assertThat(be.getCode()).isEqualTo(401);
                    });
            verify(authHelper).recordLoginFailure(anyString(), anyString());
        }
    }

    @Nested
    @DisplayName("getCurrentUser")
    class GetCurrentUserTest {

        @Test
        @DisplayName("返回脱敏后的当前用户信息")
        void shouldReturnMaskedUserInfo() {
            User user = createUser();

            when(userMapper.selectById(1L)).thenReturn(user);
            when(authHelper.maskPhone(PHONE)).thenReturn("138****8000");

            UserInfoVO vo = userAuthService.getCurrentUser(1L);

            assertThat(vo.getId()).isEqualTo(1L);
            assertThat(vo.getPhone()).isEqualTo("138****8000");
            assertThat(vo.getNickname()).isEqualTo("用户8000");
        }

        @Test
        @DisplayName("用户不存在抛出 404")
        void shouldThrow404WhenUserNotFound() {
            when(userMapper.selectById(999L)).thenReturn(null);

            assertThatThrownBy(() -> userAuthService.getCurrentUser(999L))
                    .isInstanceOf(BusinessException.class)
                    .satisfies(e -> {
                        BusinessException be = (BusinessException) e;
                        assertThat(be.getCode()).isEqualTo(404);
                    });
        }
    }

    @Nested
    @DisplayName("isPhoneRegistered")
    class IsPhoneRegisteredTest {

        @Test
        @DisplayName("手机号已注册返回 true")
        void shouldReturnTrueWhenPhoneRegistered() {
            when(userMapper.selectCount(any())).thenReturn(1L);

            assertThat(userAuthService.isPhoneRegistered(PHONE)).isTrue();
        }

        @Test
        @DisplayName("手机号未注册返回 false")
        void shouldReturnFalseWhenPhoneNotRegistered() {
            when(userMapper.selectCount(any())).thenReturn(0L);

            assertThat(userAuthService.isPhoneRegistered(PHONE)).isFalse();
        }
    }

    @Nested
    @DisplayName("resetPassword")
    class ResetPasswordTest {

        @Test
        @DisplayName("重置密码成功")
        void shouldResetPasswordSuccessfully() {
            ResetPasswordDTO request = ResetPasswordDTO.builder()
                    .phone(PHONE).newPassword(NEW_PASSWORD).smsCode(SMS_CODE)
                    .build();

            User user = createUser();

            when(smsService.checkVerifyCode(PHONE, SMS_CODE)).thenReturn(true);
            when(userMapper.selectOne(any())).thenReturn(user);

            userAuthService.resetPassword(request);

            verify(userMapper).updateById(any(User.class));
        }

        @Test
        @DisplayName("短信验证码错误抛出 400")
        void shouldThrow400WhenSmsCodeInvalid() {
            ResetPasswordDTO request = ResetPasswordDTO.builder()
                    .phone(PHONE).newPassword(NEW_PASSWORD).smsCode("wrong")
                    .build();

            when(smsService.checkVerifyCode(PHONE, "wrong")).thenReturn(false);

            assertThatThrownBy(() -> userAuthService.resetPassword(request))
                    .isInstanceOf(BusinessException.class)
                    .satisfies(e -> {
                        BusinessException be = (BusinessException) e;
                        assertThat(be.getCode()).isEqualTo(400);
                        assertThat(be.getMessage()).isEqualTo("短信验证码错误或已过期");
                    });
        }

        @Test
        @DisplayName("用户不存在抛出 404")
        void shouldThrow404WhenUserNotFound() {
            ResetPasswordDTO request = ResetPasswordDTO.builder()
                    .phone(PHONE).newPassword(NEW_PASSWORD).smsCode(SMS_CODE)
                    .build();

            when(smsService.checkVerifyCode(PHONE, SMS_CODE)).thenReturn(true);
            when(userMapper.selectOne(any())).thenReturn(null);

            assertThatThrownBy(() -> userAuthService.resetPassword(request))
                    .isInstanceOf(BusinessException.class)
                    .satisfies(e -> {
                        BusinessException be = (BusinessException) e;
                        assertThat(be.getCode()).isEqualTo(404);
                        assertThat(be.getMessage()).isEqualTo("该手机号未注册");
                    });
        }
    }
}
