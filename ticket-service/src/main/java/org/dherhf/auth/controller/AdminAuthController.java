package org.dherhf.auth.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.dherhf.auth.vo.AdminInfoVO;
import org.dherhf.auth.vo.AdminLoginVO;
import org.dherhf.auth.dto.LoginDTO;
import org.dherhf.auth.service.AdminAuthService;
import org.dherhf.common.result.Result;
import org.dherhf.common.util.JwtUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

/**
 * 管理端认证控制器,提供管理员登录、登出及获取当前管理员信息接口。
 * <p>
 * 登录接口无需鉴权（Gateway 白名单放行）,
 * 登出和获取管理员信息接口需携带 {@code Authorization: Bearer {token}} 请求头。
 */
@Tag(name = "管理员认证", description = "管理员登录/登出/信息")
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
    @Operation(summary = "管理员登录")
    @PostMapping("/login")
    public Result<AdminLoginVO> login(@Valid @RequestBody LoginDTO request) {
        return Result.success(adminAuthService.login(request));
    }

    /**
     * 管理员登出,使当前 Token 立即失效。
     *
     * @param authHeader Authorization 请求头,格式 {@code Bearer {token}}
     * @return 登出成功的统一响应
     */
    @Operation(summary = "管理员登出")
    @PostMapping("/logout")
    public Result<Void> logout(@Parameter(hidden = true) @RequestHeader("Authorization") String authHeader) {
        String token = authHeader.substring(7);
        jwtUtil.blacklistToken(token);
        return Result.success();
    }

    /**
     * 获取当前登录管理员信息。
     *
     * @param adminId 当前登录管理员 ID（由 Gateway 从 JWT 提取并注入为 Header）
     * @return 当前管理员信息
     */
    @Operation(summary = "获取当前管理员信息")
    @GetMapping("/me")
    public Result<AdminInfoVO> me(@Parameter(hidden = true) @RequestHeader("X-User-Id") Long adminId) {
        return Result.success(adminAuthService.getCurrentAdmin(adminId));
    }
}
