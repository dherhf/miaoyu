package org.dherhf.auth.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.dherhf.common.util.CryptoUtil;
import org.dherhf.common.util.JwtUtil;
import org.dherhf.auth.dto.LoginDTO;
import org.dherhf.auth.vo.LoginVO;
import org.dherhf.auth.dto.RegisterDTO;
import org.dherhf.auth.dto.ResetPasswordDTO;
import org.dherhf.auth.vo.UserInfoVO;
import org.dherhf.common.exception.BusinessException;
import org.dherhf.auth.entity.User;
import org.dherhf.auth.mapper.UserMapper;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * 用户认证服务,处理用户注册、登录及当前用户信息查询。
 * <p>
 * 登录采用 BCrypt 密码比对 + JWT 颁发,退出登录通过 Redis 黑名单使 Token 失效,
 * 并通过 {@link AuthHelper} 实现登录防爆破与手机号脱敏。
 *
 * @see AuthHelper
 */
@Service
@RequiredArgsConstructor
public class UserAuthService {

    private final UserMapper userMapper;
    private final JwtUtil jwtUtil;
    private final AuthHelper authHelper;
    private final SmsService smsService;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    /**
     * 用户注册。
     * <p>
     * 先通过阿里云号码认证服务核验短信验证码,再校验手机号唯一性,
     * 使用 BCrypt 哈希密码、AES-256-GCM 加密手机号、SHA-256 哈希手机号,
     * 写入 user 表并返回脱敏后的用户信息。
     *
     * @param request 注册请求,包含手机号、密码和短信验证码
     * @return 注册成功的用户信息
     * @throws BusinessException 短信验证码错误时抛出 400,手机号已注册时抛出 409
     */
    public UserInfoVO register(RegisterDTO request) {
        if (!smsService.checkVerifyCode(request.getPhone(), request.getSmsCode())) {
            throw new BusinessException(400, "短信验证码错误或已过期");
        }

        String phone = request.getPhone();
        String phoneHash = CryptoUtil.sha256(phone);

        Long existCount = userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getPhoneHash, phoneHash));
        if (existCount > 0) {
            throw new BusinessException(409, "该手机号已注册");
        }

        User user = User.builder()
                .phone(CryptoUtil.encrypt(phone))
                .phoneHash(phoneHash)
                .password(passwordEncoder.encode(request.getPassword()))
                .nickname("用户" + phone.substring(phone.length() - 4))
                .status(1)
                .build();
        userMapper.insert(user);

        return UserInfoVO.builder()
                .id(user.getId())
                .phone(authHelper.maskPhone(phone))
                .nickname(user.getNickname())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .build();
    }

    /**
     * 用户登录。
     * <p>
     * 执行登录防爆破校验、手机号哈希查询用户、BCrypt 密码比对,
     * 通过后颁发 JWT（userId 和 type 写入 claims）,并清除失败计数。
     *
     * @param request 登录请求,包含手机号和密码
     * @return 登录响应,包含 Token、有效期和用户信息
     * @throws BusinessException 账号锁定时抛出 403,用户名或密码错误时抛出 401
     */
    public LoginVO login(LoginDTO request) {
        String phone = request.getPhone();
        String phoneHash = CryptoUtil.sha256(phone);
        String failKey = "login:fail:" + phoneHash;
        String lockKey = "login:lock:" + phoneHash;

        if (authHelper.isAccountLocked(lockKey)) {
            throw new BusinessException(403, "账号已锁定,请15分钟后重试");
        }

        User user = userMapper.selectOne(
                new LambdaQueryWrapper<User>().eq(User::getPhoneHash, phoneHash));

        if (user == null || user.getStatus() == 0) {
            authHelper.recordLoginFailure(failKey, lockKey);
            throw new BusinessException(401, "用户名或密码错误");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            authHelper.recordLoginFailure(failKey, lockKey);
            throw new BusinessException(401, "用户名或密码错误");
        }

        String token = jwtUtil.generateToken(user.getId(), "user");
        authHelper.clearLoginFailure(failKey);

        UserInfoVO userInfo = UserInfoVO.builder()
                .id(user.getId())
                .phone(authHelper.maskPhone(phone))
                .nickname(user.getNickname())
                .status(user.getStatus())
                .build();

        return LoginVO.builder()
                .token(token)
                .userInfo(userInfo)
                .build();
    }

    /**
     * 检查手机号是否已注册。
     *
     * @param phone 手机号
     * @return 已注册返回 {@code true},否则 {@code false}
     */
    public boolean isPhoneRegistered(String phone) {
        String phoneHash = CryptoUtil.sha256(phone);
        Long count = userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getPhoneHash, phoneHash));
        return count > 0;
    }

    /**
     * 重置密码。
     * <p>
     * 先核验短信验证码,通过后查找用户并更新密码。
     *
     * @param request 重置密码请求,包含手机号、新密码和短信验证码
     * @throws BusinessException 短信验证码错误时抛出 400,用户不存在时抛出 404
     */
    public void resetPassword(ResetPasswordDTO request) {
        if (!smsService.checkVerifyCode(request.getPhone(), request.getSmsCode())) {
            throw new BusinessException(400, "短信验证码错误或已过期");
        }

        String phoneHash = CryptoUtil.sha256(request.getPhone());
        User user = userMapper.selectOne(
                new LambdaQueryWrapper<User>().eq(User::getPhoneHash, phoneHash));
        if (user == null) {
            throw new BusinessException(404, "该手机号未注册");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userMapper.updateById(user);
    }

    /**
     * 获取当前登录用户信息。
     * <p>
     * 根据传入的用户 ID 查询数据库,返回脱敏后的用户信息。
     *
     * @param userId 用户 ID（由 Gateway 从 JWT 提取,
     *               经 {@code @RequestHeader("X-User-Id")} 由 Controller 传入）
     * @return 当前用户信息
     * @throws BusinessException 用户不存在时抛出 404
     */
    public UserInfoVO getCurrentUser(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(404, "用户不存在");
        }

        return UserInfoVO.builder()
                .id(user.getId())
                .phone(authHelper.maskPhone(CryptoUtil.decrypt(user.getPhone())))
                .nickname(user.getNickname())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
