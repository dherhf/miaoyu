-- ============================================================
-- 1. 影片表 movie
-- ============================================================
CREATE TABLE `movie` (
  `id`            BIGINT       NOT NULL COMMENT '影片ID',
  `name`          VARCHAR(50)  NOT NULL COMMENT '影片名称,1-50字符,不可重名',
  `types`         JSON         NOT NULL COMMENT '影片类型标签 (如 ["科幻","动作"]),多选',
  `poster_url`    VARCHAR(255) NOT NULL COMMENT '海报图片URL',
  `rating`        DECIMAL(3,1) NOT NULL COMMENT '评分(0.0-10.0),保留一位小数',
  `duration`      INT          NOT NULL COMMENT '时长(分钟),1-300,用于排片冲突校验',
  `release_date`  DATE         NOT NULL COMMENT '上映日期',
  `director`     VARCHAR(50)  DEFAULT NULL COMMENT '导演,1-50字符',
  `actors`        VARCHAR(100) DEFAULT NULL COMMENT '主演,1-100字符',
  `description`   TEXT         DEFAULT NULL COMMENT '简介,1-500字符',
  `status`        TINYINT      NOT NULL DEFAULT 1 COMMENT '状态:1-上架,0-下架',
  `deleted`       TINYINT      NOT NULL DEFAULT 0 COMMENT '逻辑删除:0-未删除,1-已删除',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_name` (`name`),
  KEY `idx_status_release` (`status`, `release_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='影片表';

-- ============================================================
-- 2. 影院表 cinema
-- ============================================================
CREATE TABLE `cinema` (
  `id`         BIGINT        NOT NULL COMMENT '影院ID',
  `name`       VARCHAR(50)   NOT NULL COMMENT '影院名称,1-50字符,不可重名',
  `address`    VARCHAR(200)  NOT NULL COMMENT '地址,省市区+详细地址,1-200字符',
  `longitude`  DECIMAL(10,7) NOT NULL COMMENT '经度,范围-180~180,用于距离计算',
  `latitude`   DECIMAL(10,7) NOT NULL COMMENT '纬度,范围-90~90,用于距离计算',
  `facilities` JSON          DEFAULT NULL COMMENT '设施标签,如 ["IMAX","杜比","4DX","巨幕厅"]',
  `rating`     DECIMAL(3,1)  DEFAULT NULL COMMENT '评分(0.0-10.0),保留一位小数',
  `phone`      VARCHAR(20)   DEFAULT NULL COMMENT '联系电话',
  `status`     TINYINT       NOT NULL DEFAULT 1 COMMENT '营业状态:1-营业中,0-停业',
  `deleted`    TINYINT       NOT NULL DEFAULT 0 COMMENT '逻辑删除:0-未删除,1-已删除',
  `created_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_name` (`name`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='影院表';

-- ============================================================
-- 3. 用户表 user
-- ============================================================
CREATE TABLE `user` (
  `id`         BIGINT       NOT NULL COMMENT '用户ID',
  `phone`      VARBINARY(255) NOT NULL COMMENT '手机号,AES-256加密存储',
  `phone_hash` VARCHAR(64)  NOT NULL COMMENT '手机号SHA-256哈希值,用于唯一性校验和等值查询',
  `password`   VARCHAR(100) NOT NULL COMMENT '密码,BCrypt加盐哈希',
  `nickname`   VARCHAR(50)  DEFAULT NULL COMMENT '昵称',
  `status`     TINYINT      NOT NULL DEFAULT 1 COMMENT '状态:1-正常,0-禁用',
  `deleted`    TINYINT      NOT NULL DEFAULT 0 COMMENT '逻辑删除:0-未删除,1-已删除',
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_phone_hash` (`phone_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- ============================================================
-- 4. 管理员表 admin
-- ============================================================
CREATE TABLE `admin` (
  `id`         BIGINT       NOT NULL COMMENT '管理员ID',
  `phone`      VARBINARY(255) NOT NULL COMMENT '手机号,AES-256加密存储',
  `phone_hash` VARCHAR(64)  NOT NULL COMMENT '手机号SHA-256哈希值',
  `password`   VARCHAR(100) NOT NULL COMMENT '密码,BCrypt加盐哈希',
  `name`       VARCHAR(50)  NOT NULL COMMENT '管理员姓名',
  `status`     TINYINT      NOT NULL DEFAULT 1 COMMENT '状态:1-正常,0-禁用',
  `deleted`    TINYINT      NOT NULL DEFAULT 0 COMMENT '逻辑删除:0-未删除,1-已删除',
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_phone_hash` (`phone_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员表';

-- ============================================================
-- 5. 影厅表 halls
-- ============================================================
CREATE TABLE `halls` (
  `id`          BIGINT      NOT NULL AUTO_INCREMENT,
  `cinema_id`   BIGINT      NOT NULL COMMENT '所属影院ID',
  `name`        VARCHAR(50) NOT NULL COMMENT '影厅名称,同影院内不可重名',
  `screen_type` VARCHAR(20) DEFAULT '2D' COMMENT '放映类型:2D/3D/IMAX等',
  `total_rows`  INT         NOT NULL DEFAULT 0 COMMENT '总行数,由座位布局编辑画布确定',
  `total_cols`  INT         NOT NULL DEFAULT 0 COMMENT '总列数,由座位布局编辑画布确定',
  `status`      TINYINT     NOT NULL DEFAULT 1 COMMENT '状态:1-启用,0-停用',
  `deleted`     TINYINT     NOT NULL DEFAULT 0 COMMENT '逻辑删除:0-未删除,1-已删除',
  `created_at`  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  FOREIGN KEY (`cinema_id`) REFERENCES `cinema` (`id`),
  KEY `idx_cinema` (`cinema_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='影厅表';

-- ============================================================
-- 6. 影厅物理座位表 hall_cells
-- ============================================================
CREATE TABLE `hall_cells` (
  `id`            BIGINT      NOT NULL AUTO_INCREMENT,
  `hall_id`       BIGINT      NOT NULL COMMENT '所属影厅ID',
  `row_index`     INT         NOT NULL COMMENT '行坐标,范围 1..total_rows',
  `col_index`     INT         NOT NULL COMMENT '列坐标,范围 1..total_cols',
  `cell_type`     ENUM('seat','void') NOT NULL COMMENT '格子类型:seat-座位,void-空白',
  `seat_label`    VARCHAR(10) DEFAULT NULL COMMENT '座位展示名,如 "A1", "B3"',
  `seat_category` VARCHAR(20) DEFAULT NULL COMMENT '座位类别:regular/vip/couple/wheelchair',
  `status`        VARCHAR(20) DEFAULT 'active' COMMENT '物理状态:active/maintenance/blocked',
  `created_at`    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  FOREIGN KEY (`hall_id`) REFERENCES `halls` (`id`),
  UNIQUE KEY `uk_cell_position` (`hall_id`, `row_index`, `col_index`),
  UNIQUE KEY `uk_seat_label` (`hall_id`, `seat_label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='影厅物理座位表';

-- ============================================================
-- 7. 场次表 schedules
-- ============================================================
CREATE TABLE `schedules` (
  `id`          BIGINT        NOT NULL AUTO_INCREMENT,
  `movie_id`    BIGINT        NOT NULL COMMENT '影片ID',
  `cinema_id`   BIGINT        NOT NULL COMMENT '影院ID',
  `hall_id`     BIGINT        NOT NULL COMMENT '影厅ID',
  `show_date`   DATE          NOT NULL COMMENT '放映日期',
  `start_time`  TIME          NOT NULL COMMENT '放映开始时间',
  `end_time`    TIME          NOT NULL COMMENT '放映结束时间(start_time + 影片时长)',
  `price`       DECIMAL(10,2) NOT NULL COMMENT '票价',
  `total_seats` INT           NOT NULL COMMENT '总座位数,创建时从影厅seat数量统计',
  `status`      ENUM('onsale','cancelled','ended') NOT NULL DEFAULT 'onsale' COMMENT '可售/已取消/已结束',
  `deleted`     TINYINT       NOT NULL DEFAULT 0 COMMENT '逻辑删除:0-未删除,1-已删除',
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  FOREIGN KEY (`movie_id`)  REFERENCES `movie` (`id`),
  FOREIGN KEY (`cinema_id`) REFERENCES `cinema` (`id`),
  FOREIGN KEY (`hall_id`)   REFERENCES `halls` (`id`),
  KEY `idx_cinema_hall_date` (`cinema_id`, `hall_id`, `show_date`),
  KEY `idx_movie` (`movie_id`),
  KEY `idx_show_date` (`show_date`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='场次表';

-- ============================================================
-- 8. 订单表 orders
-- ============================================================
CREATE TABLE `orders` (
  `id`            BIGINT        NOT NULL AUTO_INCREMENT COMMENT '订单ID',
  `order_no`      VARCHAR(32)   NOT NULL COMMENT '订单编号,全局唯一,格式:yyyyMMdd + 雪花ID',
  `user_id`       BIGINT        NOT NULL COMMENT '用户ID',
  `schedule_id`   BIGINT        NOT NULL COMMENT '场次ID',
  `movie_name`    VARCHAR(50)   NOT NULL COMMENT '影片名称(冗余存储)',
  `cinema_name`   VARCHAR(50)   NOT NULL COMMENT '影院名称(冗余存储)',
  `hall_name`     VARCHAR(50)   NOT NULL COMMENT '影厅名称(冗余存储)',
  `show_date`     DATE          NOT NULL COMMENT '放映日期(冗余存储)',
  `start_time`    TIME          NOT NULL COMMENT '放映开始时间(冗余存储)',
  `seat_info`     VARCHAR(500)  NOT NULL COMMENT '座位信息,如 5排6座,5排7座',
  `ticket_count`  INT           NOT NULL COMMENT '票数,等于所选座位数',
  `total_amount`  DECIMAL(10,2) NOT NULL COMMENT '订单总金额 = 票价 × 票数,后端计算',
  `status`        ENUM('pending','paid','cancelled','refunded') NOT NULL DEFAULT 'pending' COMMENT '待支付/已出票/已取消/已退票',
  `pickup_code`   VARCHAR(32)   DEFAULT NULL COMMENT '取票码,支付成功后生成(UUID)',
  `cancel_reason` VARCHAR(50)   DEFAULT NULL COMMENT '取消原因:超时取消/用户主动取消/用户退票',
  `created_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间(下单时间)',
  `paid_at`       DATETIME      DEFAULT NULL COMMENT '支付时间',
  `cancelled_at`  DATETIME      DEFAULT NULL COMMENT '取消/退票时间',
  `updated_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_user_status` (`user_id`, `status`),
  KEY `idx_user_created` (`user_id`, `created_at`),
  KEY `idx_schedule` (`schedule_id`),
  CONSTRAINT `fk_orders_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `schedules` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

-- ============================================================
-- 9. 场次座位表 schedule_seats
-- ============================================================
CREATE TABLE `schedule_seats` (
  `id`           BIGINT  NOT NULL AUTO_INCREMENT,
  `schedule_id`  BIGINT  NOT NULL COMMENT '场次ID',
  `hall_cell_id` BIGINT  NOT NULL COMMENT '关联影厅物理座位ID(hall_cells.id)',
  `seat_index`   INT     NOT NULL COMMENT 'Bitmap位偏移量,按(row,col)排序从0递增',
  `status`       ENUM('available','locked','sold') NOT NULL DEFAULT 'available' COMMENT '可选/已锁定/已售',
  `locked_at`    DATETIME DEFAULT NULL COMMENT '锁定时间,用于超时释放判断',
  `order_id`     BIGINT   DEFAULT NULL COMMENT '关联订单ID(已售时填充)',
  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  FOREIGN KEY (`schedule_id`)  REFERENCES `schedules` (`id`),
  FOREIGN KEY (`hall_cell_id`) REFERENCES `hall_cells` (`id`),
  FOREIGN KEY (`order_id`)     REFERENCES `orders` (`id`),
  UNIQUE KEY `uk_schedule_seat` (`schedule_id`, `hall_cell_id`),
  UNIQUE KEY `uk_schedule_seat_index` (`schedule_id`, `seat_index`),
  KEY `idx_schedule_status` (`schedule_id`, `status`),
  KEY `idx_locked_at` (`locked_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='场次座位表,记录每个场次每个物理座位的实时状态';

-- ============================================================
-- 10. 用户偏好表 user_preference
-- ============================================================
CREATE TABLE `user_preference` (
  `id`                     BIGINT        NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `user_id`                BIGINT        NOT NULL COMMENT '用户ID,关联user表',
  `preferred_hall_type`   VARCHAR(50)   DEFAULT NULL COMMENT '偏好影厅类型,如 IMAX/杜比',
  `price_min`             DECIMAL(10,2) DEFAULT NULL COMMENT '偏好价格区间下限',
  `price_max`             DECIMAL(10,2) DEFAULT NULL COMMENT '偏好价格区间上限',
  `preferred_seat_area`   VARCHAR(50)   DEFAULT NULL COMMENT '偏好座位区域,如 5-8排中间',
  `preferred_movie_types`  JSON          DEFAULT NULL COMMENT '偏好影片类型,如 ["科幻","喜剧"]',
  `updated_at`            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_id` (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户偏好表';

-- ============================================================
-- 11. 消息通知表 notification
-- ============================================================
CREATE TABLE `notification` (
  `id`               BIGINT  NOT NULL AUTO_INCREMENT COMMENT '通知ID',
  `user_id`          BIGINT  NOT NULL COMMENT '用户ID,关联user表',
  `type`             ENUM('LOCK_SUCCESS','PAY_SUCCESS','TIMEOUT_CANCEL','REFUND_SUCCESS','SCHEDULE_CHANGE','SCREENING_REMINDER') NOT NULL COMMENT '通知类型',
  `title`            VARCHAR(100) NOT NULL COMMENT '通知标题',
  `content`          TEXT    NOT NULL COMMENT '通知内容',
  `related_order_id` BIGINT  DEFAULT NULL COMMENT '关联订单ID',
  `is_read`          TINYINT NOT NULL DEFAULT 0 COMMENT '是否已读:0-未读,1-已读',
  `created_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_read_created` (`user_id`, `is_read`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消息通知表';