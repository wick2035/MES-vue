-- ============================================================
-- Demo data: single walkable flow reset
-- Date: 2026-06-21
--
-- 目的（对齐"有且只有一条流程可以完成、每步唯一页面"）：
--   把演示业务单据收敛为【唯一一条、从草稿开始】的台式电脑主机(DPC_HOST)生产流程，
--   让用户从第 1 步「生产订单」亲手走到完工，每一步只在其专属页面操作：
--     生产订单(提交) → 审批中心(通过) → 生产工单(生成) → 物料需求计划(MRP+下发)
--     → 出入库管理(入库/配套出库) → 设备作业派工 → 员工作业派工 → 生产计划下发
--     → 工序采集(按 SN 执行) → 看板
--
-- 设计说明：
--   * 本脚本只清理"演示业务单据层"（订单/工单/排产/派工/MRP/出入库/SN/审批流），
--     不动主数据与库存——主数据(锁定的 DPC 多级 BOM、物料、加工单元、工序、工艺路线、
--     班组员工、设备、仓库库位、期初库存)由 demo-data-optimized-manufacturing-20260614.sql 提供。
--   * 然后只插入【一张草稿态生产订单】（DRAFT / 审批 DRAFT / 运营 NONE），引用已定版 BOM，
--     不预置工单、排产、派工、MRP、出入库——这些由用户顺流程逐步生成。
--   * IOT_TERMINAL 的草稿 BOM 作为"未定版"主数据保留（无法建单，不构成第二条可完成流程）。
--
-- 前置条件（手动执行，dev 库 sparchetype）：
--   先执行 demo-data-optimized-manufacturing-20260614.sql（提供 DPC 主数据与期初库存），
--   再执行本脚本将业务层收敛为唯一草稿起点。脚本可重复执行。
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. 清理演示业务单据层（保留主数据与库存）
-- ============================================================
DELETE FROM `sp_workflow_event_log` WHERE `id` LIKE 'demo\_%';
DELETE FROM `sp_workflow_task` WHERE `id` LIKE 'demo\_%';
DELETE FROM `sp_workflow_instance` WHERE `id` LIKE 'demo\_%';
DELETE FROM `sp_warehouse_transaction` WHERE `id` LIKE 'demo\_%';
DELETE FROM `sp_warehouse_request_allocation` WHERE `id` LIKE 'demo\_%';
DELETE FROM `sp_warehouse_request_item` WHERE `id` LIKE 'demo\_%';
DELETE FROM `sp_warehouse_request` WHERE `id` LIKE 'demo\_%';
DELETE FROM `sp_material_inbound_request_item` WHERE `id` LIKE 'demo\_%';
DELETE FROM `sp_material_inbound_request` WHERE `id` LIKE 'demo\_%';
DELETE FROM `sp_material_requirement_plan` WHERE `id` LIKE 'demo\_%';
DELETE FROM `sp_sn_process_record` WHERE `id` LIKE 'demo\_%';
DELETE FROM `sp_order_oper_assign` WHERE `id` LIKE 'demo\_%';
DELETE FROM `sp_order_oper_equipment_assign` WHERE `id` LIKE 'demo\_%';
DELETE FROM `sp_production_order_oper_plan` WHERE `id` LIKE 'demo\_%';
DELETE FROM `sp_production_order_item` WHERE `id` LIKE 'demo\_%';
DELETE FROM `sp_production_order` WHERE `id` LIKE 'demo\_%';
DELETE FROM `sp_order` WHERE `id` LIKE 'demo\_%';

-- ============================================================
-- 2. 唯一一条流程的起点：一张草稿态 DPC_HOST 生产订单
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
-- 3. 自检：应只剩一张草稿订单，且引用已定版成品 BOM
-- ============================================================
SELECT po.order_no, po.status, po.approval_status, po.operation_status,
       i.product_name, i.bom_code, b.lock_status, b.state, b.validity, b.bom_level
FROM `sp_production_order` po
JOIN `sp_production_order_item` i ON i.order_id = po.id
JOIN `sp_bom` b ON b.id = i.bom_id
WHERE po.id LIKE 'demo\_%';
