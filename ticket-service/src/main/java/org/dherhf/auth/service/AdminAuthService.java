package org.dherhf.auth.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.dherhf.util.CryptoUtil;
import org.dherhf.util.JwtUtil;
import org.dherhf.auth.dto.AdminInfoVO;
import org.dherhf.auth.dto.AdminLoginResponse;
import org.dherhf.auth.dto.LoginRequest;
import org.dherhf.common.BusinessException;
import org.dherhf.common.Result;
import org.dherhf.entity.Admin;
import org.dherhf.mapper.AdminMapper;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * 管理员认证服务,处理管理员登录及当前管理员信息查询。
 * <p>
 * 管理员 Token 有效期 8 小时,退出登录通过 Redis 黑名单使 Token 失效。
 * 登录防爆破逻辑与用户端共用 {@link AuthHelper}。
 *
 * @see AuthHelper
 */
@Service
@RequiredArgsConstructor
public class AdminAuthService {

    private final AdminMapper adminMapper;
    private final JwtUtil jwtUtil;
    private final AuthHelper authHelper;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    /**
     * 管理员登录。
     * <p>
     * 执行登录防爆破校验、手机号哈希查询管理员、BCrypt 密码比对,
     * 通过后颁发 JWT（adminId 和 type 写入 claims）,并清除失败计数。
     *
     * @param request 登录请求,包含手机号和密码
     * @return 登录响应,包含 Token、有效期和管理员信息
     * @throws BusinessException 账号锁定时抛出 403,用户名或密码错误时抛出 401
     */
    public Result<?> login(LoginRequest request) {
        String phone = request.getPhone();
        String phoneHash = CryptoUtil.sha256(phone);
        String failKey = "login:fail:" + phoneHash;
        String lockKey = "login:lock:" + phoneHash;

        if (authHelper.isAccountLocked(lockKey)) {
            throw new BusinessException(403, "账号已锁定,请15分钟后重试");
        }

        Admin admin = adminMapper.selectOne(
                new LambdaQueryWrapper<Admin>().eq(Admin::getPhoneHash, phoneHash));

        if (admin == null || admin.getStatus() == 0) {
            authHelper.recordLoginFailure(failKey, lockKey);
            throw new BusinessException(401, "用户名或密码错误");
        }

        if (!passwordEncoder.matches(request.getPassword(), admin.getPassword())) {
            authHelper.recordLoginFailure(failKey, lockKey);
            throw new BusinessException(401, "用户名或密码错误");
        }

        String token = jwtUtil.generateToken(admin.getId(), "admin");
        authHelper.clearLoginFailure(failKey);

        AdminInfoVO adminInfo = new AdminInfoVO();
        adminInfo.setId(admin.getId());
        adminInfo.setName(admin.getName());
        adminInfo.setStatus(admin.getStatus());

        AdminLoginResponse response = new AdminLoginResponse();
        response.setToken(token);
        response.setAdminInfo(adminInfo);

        return Result.success(response);
    }

    /**
     * 获取当前登录管理员信息。
     * <p>
     * 根据传入的管理员 ID 查询数据库,返回管理员信息。
     *
     * @param adminId 管理员 ID（由 {@link org.dherhf.interceptor.AuthInterceptor} 从 JWT 提取,
     *               经 {@code @RequestAttribute} 由 Controller 传入）
     * @return 当前管理员信息
     * @throws BusinessException 管理员不存在时抛出 404
     */
    public Result<?> getCurrentAdmin(Long adminId) {
        Admin admin = adminMapper.selectById(adminId);
        if (admin == null) {
            throw new BusinessException(404, "管理员不存在");
        }

        AdminInfoVO vo = new AdminInfoVO();
        vo.setId(admin.getId());
        vo.setName(admin.getName());
        vo.setStatus(admin.getStatus());

        return Result.success(vo);
    }
}
