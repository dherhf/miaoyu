package org.dherhf.auth.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.dherhf.common.interceptor.AuthInterceptor;
import org.dherhf.common.util.CryptoUtil;
import org.dherhf.common.util.JwtUtil;
import org.dherhf.auth.dto.LoginDTO;
import org.dherhf.auth.vo.LoginVO;
import org.dherhf.auth.dto.RegisterDTO;
import org.dherhf.auth.vo.UserInfoVO;
import org.dherhf.common.exception.BusinessException;
import org.dherhf.common.result.Result;
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

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    /**
     * 用户注册。
     * <p>
     * 校验手机号唯一性后,使用 BCrypt 哈希密码、AES-256-GCM 加密手机号、SHA-256 哈希手机号,
     * 写入 user 表并返回脱敏后的用户信息。
     *
     * @param request 注册请求,包含手机号和密码
     * @return 注册成功的用户信息
     * @throws BusinessException 手机号已注册时抛出 409
     */
    public Result<UserInfoVO> register(RegisterDTO request) {
        String phone = request.getPhone();
        String phoneHash = CryptoUtil.sha256(phone);

        Long existCount = userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getPhoneHash, phoneHash));
        if (existCount > 0) {
            throw new BusinessException(409, "该手机号已注册");
        }

        User user = new User();
        user.setPhone(CryptoUtil.encrypt(phone));
        user.setPhoneHash(phoneHash);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setNickname("用户" + phone.substring(phone.length() - 4));
        user.setStatus(1);
        userMapper.insert(user);

        UserInfoVO vo = new UserInfoVO();
        vo.setId(user.getId());
        vo.setPhone(authHelper.maskPhone(phone));
        vo.setNickname(user.getNickname());
        vo.setStatus(user.getStatus());
        vo.setCreatedAt(user.getCreatedAt());

        return Result.success(vo);
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
    public Result<LoginVO> login(LoginDTO request) {
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

        UserInfoVO userInfo = new UserInfoVO();
        userInfo.setId(user.getId());
        userInfo.setPhone(authHelper.maskPhone(phone));
        userInfo.setNickname(user.getNickname());
        userInfo.setStatus(user.getStatus());

        LoginVO response = new LoginVO();
        response.setToken(token);
        response.setUserInfo(userInfo);

        return Result.success(response);
    }

    /**
     * 获取当前登录用户信息。
     * <p>
     * 根据传入的用户 ID 查询数据库,返回脱敏后的用户信息。
     *
     * @param userId 用户 ID（由 {@link AuthInterceptor} 从 JWT 提取,
     *               经 {@code @RequestAttribute} 由 Controller 传入）
     * @return 当前用户信息
     * @throws BusinessException 用户不存在时抛出 404
     */
    public Result<UserInfoVO> getCurrentUser(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(404, "用户不存在");
        }

        UserInfoVO vo = new UserInfoVO();
        vo.setId(user.getId());
        vo.setPhone(authHelper.maskPhone(CryptoUtil.decrypt(user.getPhone())));
        vo.setNickname(user.getNickname());
        vo.setStatus(user.getStatus());
        vo.setCreatedAt(user.getCreatedAt());

        return Result.success(vo);
    }
}
