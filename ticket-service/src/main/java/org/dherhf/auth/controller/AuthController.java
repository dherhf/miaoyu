package org.dherhf.auth.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.dherhf.auth.dto.LoginRequest;
import org.dherhf.auth.dto.LoginResponse;
import org.dherhf.auth.dto.RegisterRequest;
import org.dherhf.auth.dto.UserInfoVO;
import org.dherhf.auth.service.UserAuthService;
import org.dherhf.common.Result;
import org.dherhf.util.JwtUtil;
import org.springframework.web.bind.annotation.*;

/**
 * 用户端认证控制器,提供用户注册、登录、登出及获取当前用户信息接口。
 * <p>
 * 注册和登录接口无需鉴权（由 {@link org.dherhf.config.WebMvcConfig} 排除拦截）,
 * 登出和获取用户信息接口需携带 {@code Authorization: Bearer {token}} 请求头。
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserAuthService userAuthService;
    private final JwtUtil jwtUtil;

    /**
     * 用户注册。
     *
     * @param request 注册请求,包含手机号和密码
     * @return 注册成功的用户信息
     */
    @PostMapping("/register")
    public Result<UserInfoVO> register(@Valid @RequestBody RegisterRequest request) {
        return userAuthService.register(request);
    }

    /**
     * 用户登录。
     *
     * @param request 登录请求,包含手机号和密码
     * @return 登录响应,包含 Token 和用户信息
     */
    @PostMapping("/login")
    public Result<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return userAuthService.login(request);
    }

    /**
     * 用户登出,使当前 Token 立即失效。
     *
     * @param authHeader Authorization 请求头,格式 {@code Bearer {token}}
     * @return 登出成功的统一响应
     */
    @PostMapping("/logout")
    public Result<Void> logout(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.substring(7);
        jwtUtil.blacklistToken(token);
        return Result.success();
    }

    /**
     * 获取当前登录用户信息。
     *
     * @param userId 当前登录用户 ID（由 {@link org.dherhf.interceptor.AuthInterceptor} 从 JWT
     *               提取并注入为 request attribute）
     * @return 当前用户信息（手机号脱敏）
     */
    @GetMapping("/me")
    public Result<UserInfoVO> me(@RequestAttribute("userId") Long userId) {
        return userAuthService.getCurrentUser(userId);
    }
}
