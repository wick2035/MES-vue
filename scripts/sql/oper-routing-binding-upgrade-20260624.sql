-- 工序定义 & 工艺路线 真实绑定升级（2026-06-24）
-- 1) sp_oper 增加 归口部门(dept_id) / 执行班组(team_id) 两列（加工单元 unit_id 已存在）
-- 2) sp_flow_oper_relation 补 flow_id 索引（步骤查询/重建按 flow_id 过滤）
-- 脚本可重复执行（先判存在再变更）。

-- ===== sp_oper.dept_id =====
SET @sp_oper_dept_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sp_oper'
      AND COLUMN_NAME = 'dept_id'
);
SET @sp_oper_dept_sql = IF(
    @sp_oper_dept_exists = 0,
    'ALTER TABLE `sp_oper` ADD COLUMN `dept_id` varchar(64) NULL COMMENT ''归口部门ID（sp_sys_department.id）'' AFTER `oper_desc`',
    'SELECT 1'
);
PREPARE stmt FROM @sp_oper_dept_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ===== sp_oper.team_id =====
SET @sp_oper_team_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sp_oper'
      AND COLUMN_NAME = 'team_id'
);
SET @sp_oper_team_sql = IF(
    @sp_oper_team_exists = 0,
    'ALTER TABLE `sp_oper` ADD COLUMN `team_id` varchar(64) NULL COMMENT ''执行班组ID（sp_team.id）'' AFTER `dept_id`',
    'SELECT 1'
);
PREPARE stmt FROM @sp_oper_team_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ===== sp_flow_oper_relation.idx_flow_id =====
SET @sp_flow_rel_idx_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sp_flow_oper_relation'
      AND INDEX_NAME = 'idx_flow_id'
);
SET @sp_flow_rel_idx_sql = IF(
    @sp_flow_rel_idx_exists = 0,
    'ALTER TABLE `sp_flow_oper_relation` ADD INDEX `idx_flow_id` (`flow_id`)',
    'SELECT 1'
);
PREPARE stmt FROM @sp_flow_rel_idx_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
