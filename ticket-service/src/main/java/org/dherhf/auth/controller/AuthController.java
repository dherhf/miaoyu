package org.dherhf.auth.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.dherhf.auth.dto.LoginDTO;
import org.dherhf.auth.vo.LoginVO;
import org.dherhf.auth.dto.RegisterDTO;
import org.dherhf.auth.dto.ResetPasswordDTO;
import org.dherhf.auth.dto.SendSmsCodeDTO;
import org.dherhf.auth.vo.CaptchaVO;
import org.dherhf.auth.vo.UserInfoVO;
import org.dherhf.auth.service.CaptchaService;
import org.dherhf.auth.service.SmsService;
import org.dherhf.auth.service.UserAuthService;
import org.dherhf.common.exception.BusinessException;
import org.dherhf.common.result.Result;
import org.dherhf.common.util.JwtUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

/**
 * 用户端认证控制器,提供用户注册、登录、登出及获取当前用户信息接口。
 * <p>
 * 注册和登录接口无需鉴权（Gateway 白名单放行）,
 * 登出和获取用户信息接口需携带 {@code Authorization: Bearer {token}} 请求头。
 */
@Tag(name = "用户认证", description = "注册/登录/登出/用户信息")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserAuthService userAuthService;
    private final CaptchaService captchaService;
    private final SmsService smsService;
    private final JwtUtil jwtUtil;

    /**
     * 获取图形验证码。
     *
     * @return 验证码视图对象,包含 captchaId 和 Base64 图片
     */
    @Operation(summary = "获取图形验证码")
    @GetMapping("/captcha")
    public Result<CaptchaVO> captcha() {
        return Result.success(captchaService.generate());
    }

    /**
     * 发送短信验证码。
     * <p>
     * 先校验图形验证码,再根据场景校验手机号注册状态（注册场景要求未注册,
     * 重置密码场景要求已注册）,通过后调用阿里云号码认证服务发送短信验证码。
     *
     * @param request 发送短信验证码请求,包含手机号、场景和图形验证码
     * @return 发送成功的统一响应
     */
    @Operation(summary = "发送短信验证码")
    @PostMapping("/sms-code")
    public Result<Void> sendSmsCode(@Valid @RequestBody SendSmsCodeDTO request) {
        if (!captchaService.validate(request.getCaptchaId(), request.getCaptchaCode())) {
            throw new BusinessException(400, "图形验证码错误或已过期");
        }
        boolean registered = userAuthService.isPhoneRegistered(request.getPhone());
        if ("register".equals(request.getScene()) && registered) {
            throw new BusinessException(409, "该手机号已注册");
        }
        if ("reset-password".equals(request.getScene()) && !registered) {
            throw new BusinessException(404, "该手机号未注册");
        }
        smsService.sendVerifyCode(request.getPhone(), request.getScene());
        return Result.success();
    }

    /**
     * 用户注册。
     *
     * @param request 注册请求,包含手机号、密码和短信验证码
     * @return 注册成功的用户信息
     */
    @Operation(summary = "用户注册")
    @PostMapping("/register")
    public Result<UserInfoVO> register(@Valid @RequestBody RegisterDTO request) {
        return Result.success(userAuthService.register(request));
    }

    /**
     * 用户登录。
     *
     * @param request 登录请求,包含手机号和密码
     * @return 登录响应,包含 Token 和用户信息
     */
    @Operation(summary = "用户登录")
    @PostMapping("/login")
    public Result<LoginVO> login(@Valid @RequestBody LoginDTO request) {
        return Result.success(userAuthService.login(request));
    }

    /**
     * 重置密码。
     *
     * @param request 重置密码请求,包含手机号、新密码和短信验证码
     * @return 重置成功的统一响应
     */
    @Operation(summary = "重置密码")
    @PostMapping("/reset-password")
    public Result<Void> resetPassword(@Valid @RequestBody ResetPasswordDTO request) {
        userAuthService.resetPassword(request);
        return Result.success();
    }

    /**
     * 用户登出,使当前 Token 立即失效。
     *
     * @param authHeader Authorization 请求头,格式 {@code Bearer {token}}
     * @return 登出成功的统一响应
     */
    @Operation(summary = "用户登出")
    @PostMapping("/logout")
    public Result<Void> logout(@Parameter(hidden = true) @RequestHeader("Authorization") String authHeader) {
        String token = authHeader.substring(7);
        jwtUtil.blacklistToken(token);
        return Result.success();
    }

    /**
     * 获取当前登录用户信息。
     *
     * @param userId 当前登录用户 ID（由 Gateway 从 JWT 提取并注入为 Header）
     * @return 当前用户信息（手机号脱敏）
     */
    @Operation(summary = "获取当前用户信息")
    @GetMapping("/me")
    public Result<UserInfoVO> me(@Parameter(hidden = true) @RequestHeader("X-User-Id") Long userId) {
        return Result.success(userAuthService.getCurrentUser(userId));
    }
}
