-- 工序定义 & 工艺路线 演示数据补全（2026-06-24）
-- 目的：把既有演示/历史工序补全为「部门 + 加工单元 + 班组」真实绑定，
--       并修正演示加工单元状态（status=0 正常，才会出现在下拉中）。
-- 全部按主键 UPDATE，可重复执行（幂等）。仅引用已存在的部门/班组/加工单元 ID。

-- ===== 1) 演示加工单元：置为正常状态(0) 并规范类型(person/device) =====
UPDATE `sp_processing_unit` SET `status` = '0'
 WHERE `id` LIKE 'demo_unit_%';
UPDATE `sp_processing_unit` SET `unit_type` = 'person'
 WHERE `id` LIKE 'demo_unit_%' AND `unit_type` NOT IN ('person', 'device');

-- ===== 2) 演示工序：补全 部门 / 班组（加工单元已绑定）=====
UPDATE `sp_oper` SET `dept_id` = 'demo_dept_prod', `team_id` = 'demo_team_board' WHERE `id` = 'demo_op_dpc_board';
UPDATE `sp_oper` SET `dept_id` = 'demo_dept_prod', `team_id` = 'demo_team_board' WHERE `id` = 'demo_op_dpc_case';
UPDATE `sp_oper` SET `dept_id` = 'demo_dept_prod', `team_id` = 'demo_team_final' WHERE `id` = 'demo_op_dpc_final';
UPDATE `sp_oper` SET `dept_id` = 'demo_dept_qc',   `team_id` = 'demo_team_final' WHERE `id` = 'demo_op_dpc_test';
UPDATE `sp_oper` SET `dept_id` = 'demo_dept_wh',   `team_id` = 'demo_team_wh'    WHERE `id` = 'demo_op_dpc_pack';
UPDATE `sp_oper` SET `dept_id` = 'demo_dept_prod', `team_id` = 'demo_team_iot'   WHERE `id` = 'demo_op_iot_control';
UPDATE `sp_oper` SET `dept_id` = 'demo_dept_prod', `team_id` = 'demo_team_iot'   WHERE `id` = 'demo_op_iot_shell';
UPDATE `sp_oper` SET `dept_id` = 'demo_dept_qc',   `team_id` = 'demo_team_iot'   WHERE `id` = 'demo_op_iot_test';

-- ===== 3) 历史 GX 工序：补全为真实部门 / 班组（避免“未绑定”）=====
UPDATE `sp_oper` SET `dept_id` = 'dept_prod', `team_id` = 'team_01' WHERE `id` = 'op_gx000002';
UPDATE `sp_oper` SET `dept_id` = 'dept_prod', `team_id` = 'team_02' WHERE `id` = 'op_gx000003';
UPDATE `sp_oper` SET `dept_id` = 'dept_prod', `team_id` = 'team_01' WHERE `id` = 'op_gx000008';
UPDATE `sp_oper` SET `dept_id` = 'dept_qa',   `team_id` = 'team_03' WHERE `id` = 'op_gx000010';
UPDATE `sp_oper` SET `dept_id` = 'dept_wh',   `team_id` = 'team_03' WHERE `id` = 'op_gx000011';
