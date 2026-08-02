package org.dherhf.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.dherhf.entity.Order;

@Mapper
public interface OrderMapper extends BaseMapper<Order> {
}
