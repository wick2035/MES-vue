package com.wangziyang.mes.workflow.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.wangziyang.mes.workflow.entity.SpWorkflowEvent;
import com.wangziyang.mes.workflow.entity.SpWorkflowTask;

public interface ISpWorkflowEventService extends IService<SpWorkflowEvent> {

    void rebuildDefinitionEvents(String definitionId, String nodeJson);

    void executeCompleteEvents(SpWorkflowTask task);

    /** 工单审批被驳回时，回写所属生产订单审批状态为「已驳回」，使其退出后续流程 */
    void rejectOrder(SpWorkflowTask task);
}
