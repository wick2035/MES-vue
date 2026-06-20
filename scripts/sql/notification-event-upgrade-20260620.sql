-- =============================================================
-- 业务通知（事件驱动）升级脚本
-- 功能：新增 sp_notification 表，承载由真实业务事件（工序 NG、订单提交/审批、
--       工单完工/交付/驳回等）产生的通知，落库 + WebSocket 推送，支持历史与未读。
-- 说明：可重复执行（IF NOT EXISTS）。手动执行于 dev 库 sparchetype。
-- 日期：2026-06-20
-- =============================================================

CREATE TABLE IF NOT EXISTS `sp_notification` (
  `id` varchar(32) NOT NULL COMMENT '主键(雪花串)',
  `type` varchar(20) DEFAULT NULL COMMENT '类型 alarm/order/system',
  `title` varchar(200) DEFAULT NULL COMMENT '标题',
  `content` varchar(1000) DEFAULT NULL COMMENT '内容',
  `biz_type` varchar(50) DEFAULT NULL COMMENT '业务类型 SN_NG/PRODUCTION_ORDER/WORK_ORDER/INVENTORY',
  `biz_id` varchar(64) DEFAULT NULL COMMENT '业务主键',
  `target_user_id` varchar(32) DEFAULT NULL COMMENT '目标用户ID；空=全员广播',
  `is_read` char(1) DEFAULT '0' COMMENT '是否已读 0未读/1已读',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `create_username` varchar(50) DEFAULT NULL COMMENT '创建人',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `update_username` varchar(50) DEFAULT NULL COMMENT '更新人',
  `is_deleted` char(1) DEFAULT '0' COMMENT '软删 0正常/1删除',
  PRIMARY KEY (`id`),
  KEY `idx_notification_user` (`target_user_id`),
  KEY `idx_notification_read` (`is_read`),
  KEY `idx_notification_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='业务通知(事件驱动)';
