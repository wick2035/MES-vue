-- 移除工单变更功能入口与审批配置，保留历史数据表 sp_work_order_change。
-- 本脚本可重复执行。

UPDATE sp_sys_menu
SET is_deleted = '1',
    update_time = NOW(),
    update_username = 'admin'
WHERE code IN ('workOrderChange', 'productionWorkOrderChange', 'work_order_change')
   OR url IN ('/production/change', '/production-order/work-order-change/list-ui');

DELETE FROM sp_sys_role_menu
WHERE menu_id IN (
    SELECT id
    FROM sp_sys_menu
    WHERE code IN ('workOrderChange', 'productionWorkOrderChange', 'work_order_change')
       OR url IN ('/production/change', '/production-order/work-order-change/list-ui')
);

UPDATE sp_workflow_form
SET status = '2',
    update_time = NOW(),
    update_username = 'admin'
WHERE form_key = 'workOrderChange'
   OR business_type = 'WORK_ORDER_CHANGE'
   OR definition_code = 'work_order_change'
   OR event_template LIKE '%WORK_ORDER_CHANGE_APPLY%';

UPDATE sp_workflow_event
SET status = '2',
    update_time = NOW(),
    update_username = 'admin'
WHERE action_code = 'WORK_ORDER_CHANGE_APPLY'
   OR definition_id IN (
        SELECT id
        FROM sp_workflow_definition
        WHERE business_type = 'WORK_ORDER_CHANGE'
           OR definition_code = 'work_order_change'
           OR model_id = 'wf_model_work_order_change'
   );

UPDATE sp_workflow_definition
SET status = 'inactive',
    update_time = NOW(),
    update_username = 'admin'
WHERE business_type = 'WORK_ORDER_CHANGE'
   OR definition_code = 'work_order_change'
   OR model_id = 'wf_model_work_order_change';

UPDATE sp_workflow_model
SET status = 'disabled',
    update_time = NOW(),
    update_username = 'admin'
WHERE business_type = 'WORK_ORDER_CHANGE'
   OR model_code = 'work_order_change'
   OR id = 'wf_model_work_order_change';

UPDATE sp_workflow_task
SET status = 'revoked',
    action = 'revoke',
    opinion = '工单变更功能已停用',
    complete_time = COALESCE(complete_time, DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s')),
    update_time = NOW(),
    update_username = 'admin'
WHERE business_type = 'WORK_ORDER_CHANGE'
  AND status = 'todo';

UPDATE sp_workflow_instance
SET status = 'revoked',
    end_time = COALESCE(end_time, DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s')),
    remark = COALESCE(NULLIF(remark, ''), '工单变更功能已停用'),
    update_time = NOW(),
    update_username = 'admin'
WHERE business_type = 'WORK_ORDER_CHANGE'
  AND status = 'running';

-- 历史表 sp_work_order_change 保留，不做物理删表。
