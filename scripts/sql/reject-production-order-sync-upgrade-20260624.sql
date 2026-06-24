-- =============================================================================
-- 历史数据修复：被驳回的生产工单，其所属生产订单审批状态回填为「已驳回」(REJECTED)
-- -----------------------------------------------------------------------------
-- 背景：
--   早期 SpWorkflowTaskServiceImpl.reject() 驳回工单时，只更新了流程任务/实例状态，
--   没有回写生产订单 approval_status，导致「生产订单」列表里这些订单仍显示「审批中」。
--   现已在 reject() 中实时调用 eventService.rejectOrder(task) 回写为 REJECTED；
--   本脚本用于一次性修复历史遗留数据。
--
-- 规则：
--   只要某生产订单关联的任一工单审批任务被驳回(sp_workflow_task.status='rejected')，
--   即把该生产订单 approval_status 置为 'REJECTED'，使其退出派工/MRP 等后续流程。
--
-- 幂等：再次执行不会产生副作用（已为 REJECTED 的行被 WHERE 排除）。
-- 手动执行（无自动 Flyway/Liquibase）。
-- =============================================================================

UPDATE sp_production_order po
JOIN sp_production_order_item poi ON poi.order_id = po.id
JOIN sp_workflow_task wt ON wt.business_id = poi.work_order_id
SET po.approval_status = 'REJECTED'
WHERE po.is_deleted <> '1'
  AND po.approval_status <> 'REJECTED'
  AND wt.business_type = 'ORDER_APPROVAL'
  AND wt.status = 'rejected';
