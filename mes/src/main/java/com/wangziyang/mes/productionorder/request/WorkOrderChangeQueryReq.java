package com.wangziyang.mes.productionorder.request;

import com.wangziyang.mes.common.BasePageReq;

/**
 * 工单变更记录查询参数。
 */
public class WorkOrderChangeQueryReq extends BasePageReq {

    private String workOrderCodeLike;
    private String status;

    public String getWorkOrderCodeLike() {
        return workOrderCodeLike;
    }

    public void setWorkOrderCodeLike(String workOrderCodeLike) {
        this.workOrderCodeLike = workOrderCodeLike;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
