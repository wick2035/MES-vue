-- ============================================================
-- Demo data: single walkable flow reset
-- Date: 2026-06-21
--
-- 目的（对齐"清理数据库 + 有且只有一条流程可以完成、每步唯一页面"）：
--   把库里历史遗留的所有生产单据（多套 demo 脚本累积的订单/工单/排产/派工/MRP/出入库/SN/审批流）
--   全部清空，只保留主数据与库存，并插入【唯一一条、从草稿开始】的台式电脑主机(DPC_HOST)生产订单，
--   让用户从第 1 步「生产订单」亲手走到完工，每一步只在其专属页面操作：
--     生产订单(提交) → 审批中心(通过) → 生产工单(生成) → 物料需求计划(MRP+下发)
--     → 出入库管理(入库/配套出库) → 设备作业派工 → 员工作业派工 → 生产计划下发
--     → 工序采集(按 SN 执行) → 看板
--
-- 设计说明：
--   * 第 1 步清空"业务单据层"全部记录（不限 demo 前缀），因为历史多套脚本遗留了 7+ 张
--     不同状态的订单，会同时出现在审批/派工/MRP 队列里，导致"流程像是重叠"。
--   * 不动主数据与库存——主数据(锁定的 DPC 多级 BOM、物料、加工单元、工序、工艺路线、
--     班组员工、设备、仓库库位、期初库存)由 demo-data-optimized-manufacturing-20260614.sql 提供。
--   * 第 2 步把"非 DPC 的成品 BOM"置为无效，使建单可选产品 BOM 唯一（selectable-boms 只取
--     bom_level=0 / lock_status=locked / state=pass / validity=有效）。可逆，不物理删除。
--   * 第 3 步插入唯一一张草稿态 DPC 订单，不预置工单/排产/派工/MRP/出入库，由用户顺流程生成。
--   * 本脚本会清空 sp_sn_process_record；执行后数字孪生产线会先展示暂无采集的空闲工位，
--     待工序采集产生 OK/NG 记录后再显示良率、告警与物料流动。
--
-- 前置条件（手动执行，dev 库 sparchetype）：
--   先执行 demo-data-optimized-manufacturing-20260614.sql（提供 DPC 主数据与期初库存），
--   再执行本脚本将业务层收敛为唯一草稿起点。脚本可重复执行。
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. 清空业务单据层全部记录（保留主数据与库存）
-- ============================================================
DELETE FROM `sp_workflow_event_log`;
DELETE FROM `sp_workflow_task`;
DELETE FROM `sp_workflow_instance`;
DELETE FROM `sp_warehouse_transaction`;
DELETE FROM `sp_warehouse_request_allocation`;
DELETE FROM `sp_warehouse_request_item`;
DELETE FROM `sp_warehouse_request`;
DELETE FROM `sp_material_inbound_request_item`;
DELETE FROM `sp_material_inbound_request`;
DELETE FROM `sp_material_requirement_plan`;
DELETE FROM `sp_sn_process_record`;
DELETE FROM `sp_work_order_change`;
DELETE FROM `sp_order_oper_assign`;
DELETE FROM `sp_order_oper_equipment_assign`;
DELETE FROM `sp_production_order_oper_plan`;
DELETE FROM `sp_production_order_item`;
DELETE FROM `sp_production_order`;
DELETE FROM `sp_order`;

-- ============================================================
-- 2. 收敛可选产品 BOM 为唯一：非 DPC 的成品(0 层)BOM 置为无效（可逆）
-- ============================================================
UPDATE `sp_bom`
SET `validity` = '无效', `update_time` = NOW()
WHERE `bom_level` = 0
  AND `id` <> 'demo_bom_dpc_host'
  AND `validity` = '有效';

-- ============================================================
-- 3. 唯一一条流程的起点：一张草稿态 DPC_HOST 生产订单
--    status=DRAFT / approval_status=DRAFT / operation_status=NONE，
--    引用已定版成品 BOM（bom_level=0 / lock_status=locked / state=pass / validity=有效）。
--    不预置工单/排产/派工/MRP/出入库，由用户顺流程生成。
-- ============================================================
INSERT INTO `sp_production_order`
(`id`,`order_no`,`source_type`,`customer_name`,`customer_group`,`external_no`,`sales_contract_no`,`business_type`,`order_date`,`settlement_currency`,`transport_mode`,`payment_terms`,`tax_rate`,`receiver_name`,`receiver_phone`,`receiver_address`,`remark`,`status`,`approval_status`,`operation_status`,`creation_method`,`scheduling_method`,`is_deleted`,`create_time`,`create_username`,`update_time`,`update_username`) VALUES
('demo_po_walk','DD-DEMO-20260621-001','DEMAND','演示客户-华东智造','华东大客户','EXT-DEMO-DPC-WALK','HT-DEMO-DPC-WALK','普通销售','2026-06-21','人民币','公路运输','月结30天','不含税','王采购','13866010001','上海市浦东新区演示路1号','唯一演示主流程：从草稿开始，依次提交审批→生成工单→MRP→出入库→设备/员工派工→下发→工序采集','DRAFT','DRAFT','NONE','MANUAL','REVERSE','0',NOW(),'admin',NOW(),'admin')
ON DUPLICATE KEY UPDATE `order_no`=VALUES(`order_no`),`source_type`=VALUES(`source_type`),`customer_name`=VALUES(`customer_name`),`customer_group`=VALUES(`customer_group`),`external_no`=VALUES(`external_no`),`sales_contract_no`=VALUES(`sales_contract_no`),`business_type`=VALUES(`business_type`),`order_date`=VALUES(`order_date`),`remark`=VALUES(`remark`),`status`=VALUES(`status`),`approval_status`=VALUES(`approval_status`),`operation_status`=VALUES(`operation_status`),`creation_method`=VALUES(`creation_method`),`scheduling_method`=VALUES(`scheduling_method`),`is_deleted`=VALUES(`is_deleted`),`update_time`=NOW();

INSERT INTO `sp_production_order_item`
(`id`,`order_id`,`product_materiel`,`product_name`,`bom_id`,`bom_code`,`bom_version`,`model`,`specification`,`qty`,`unit_price`,`configuration`,`plan_delivery_date`,`plan_start_date`,`lead_time_days`,`target_capacity`,`computed_start_date`,`computed_delivery_date`,`material_ready_date`,`adjust_note`,`work_order_id`,`work_order_code`,`create_time`,`create_username`,`update_time`,`update_username`) VALUES
('demo_poi_walk','demo_po_walk','DPC_HOST','台式电脑主机','demo_bom_dpc_host','BOM-DPC-HOST-V1','1','DPC-HOST-A','标准配置',10,3999.00,'i5/16G/512G/标准机箱','2026-06-30','2026-06-22',1,20.00,NULL,NULL,NULL,NULL,NULL,NULL,NOW(),'admin',NOW(),'admin')
ON DUPLICATE KEY UPDATE `order_id`=VALUES(`order_id`),`product_materiel`=VALUES(`product_materiel`),`product_name`=VALUES(`product_name`),`bom_id`=VALUES(`bom_id`),`bom_code`=VALUES(`bom_code`),`bom_version`=VALUES(`bom_version`),`model`=VALUES(`model`),`specification`=VALUES(`specification`),`qty`=VALUES(`qty`),`unit_price`=VALUES(`unit_price`),`configuration`=VALUES(`configuration`),`plan_delivery_date`=VALUES(`plan_delivery_date`),`plan_start_date`=VALUES(`plan_start_date`),`lead_time_days`=VALUES(`lead_time_days`),`target_capacity`=VALUES(`target_capacity`),`computed_start_date`=VALUES(`computed_start_date`),`computed_delivery_date`=VALUES(`computed_delivery_date`),`material_ready_date`=VALUES(`material_ready_date`),`adjust_note`=VALUES(`adjust_note`),`work_order_id`=VALUES(`work_order_id`),`work_order_code`=VALUES(`work_order_code`),`update_time`=NOW();

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 4. 自检：应只剩一张草稿订单、唯一可选成品 BOM，业务单据层为空
-- ============================================================
SELECT 'prod_orders_total' AS chk, COUNT(*) AS n FROM `sp_production_order`
UNION ALL SELECT 'work_orders_total', COUNT(*) FROM `sp_order`
UNION ALL SELECT 'oper_plans_total', COUNT(*) FROM `sp_production_order_oper_plan`
UNION ALL SELECT 'mrp_total', COUNT(*) FROM `sp_material_requirement_plan`
UNION ALL SELECT 'wh_requests_total', COUNT(*) FROM `sp_warehouse_request`
UNION ALL SELECT 'sn_total', COUNT(*) FROM `sp_sn_process_record`
UNION ALL SELECT 'selectable_fg_boms', COUNT(*) FROM `sp_bom`
       WHERE bom_level=0 AND lock_status='locked' AND state='pass' AND validity='有效' AND is_deleted<>'1';

SELECT po.order_no, po.status, po.approval_status, po.operation_status,
       i.product_name, i.bom_code, b.lock_status, b.state, b.validity
FROM `sp_production_order` po
JOIN `sp_production_order_item` i ON i.order_id = po.id
JOIN `sp_bom` b ON b.id = i.bom_id;
