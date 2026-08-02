package org.dherhf.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.dherhf.dto.AdminInfoVO;
import org.dherhf.dto.AdminLoginResponse;
import org.dherhf.dto.LoginRequest;
import org.dherhf.service.AdminAuthService;
import org.dherhf.common.Result;
import org.dherhf.util.JwtUtil;
import org.springframework.web.bind.annotation.*;

/**
 * 管理端认证控制器,提供管理员登录、登出及获取当前管理员信息接口。
 * <p>
 * 登录接口无需鉴权（由 {@link org.dherhf.config.WebMvcConfig} 排除拦截）,
 * 登出和获取管理员信息接口需携带 {@code Authorization: Bearer {token}} 请求头。
 */
@RestController
@RequestMapping("/api/v1/admin/auth")
@RequiredArgsConstructor
public class AdminAuthController {

    private final AdminAuthService adminAuthService;
    private final JwtUtil jwtUtil;

    /**
     * 管理员登录。
     *
     * @param request 登录请求,包含手机号和密码
     * @return 登录响应,包含 Token 和管理员信息
     */
    @PostMapping("/login")
    public Result<AdminLoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return adminAuthService.login(request);
    }

    /**
     * 管理员登出,使当前 Token 立即失效。
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
     * 获取当前登录管理员信息。
     *
     * @param adminId 当前登录管理员 ID（由 {@link org.dherhf.interceptor.AuthInterceptor} 从 JWT
     *                提取并注入为 request attribute）
     * @return 当前管理员信息
     */
    @GetMapping("/me")
    public Result<AdminInfoVO> me(@RequestAttribute("userId") Long adminId) {
        return adminAuthService.getCurrentAdmin(adminId);
    }
}
