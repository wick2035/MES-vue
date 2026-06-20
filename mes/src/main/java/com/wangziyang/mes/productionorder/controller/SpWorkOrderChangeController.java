package com.wangziyang.mes.productionorder.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.productionorder.entity.SpWorkOrderChange;
import com.wangziyang.mes.productionorder.request.WorkOrderChangeQueryReq;
import com.wangziyang.mes.productionorder.service.ISpWorkOrderChangeService;
import io.swagger.annotations.ApiOperation;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * 工单变更记录查询接口。
 * 变更单由工单（已下达）的改动流程产生，此处提供集中查询与明细。
 */
@Controller
@RequestMapping("/production-order/work-order-change")
public class SpWorkOrderChangeController extends BaseController {

    @Autowired
    private ISpWorkOrderChangeService workOrderChangeService;

    @ApiOperation("工单变更记录分页")
    @PostMapping("/page")
    @ResponseBody
    public Result page(WorkOrderChangeQueryReq req) {
        QueryWrapper<SpWorkOrderChange> qw = new QueryWrapper<>();
        if (StringUtils.isNotBlank(req.getWorkOrderCodeLike())) {
            qw.like("work_order_code", req.getWorkOrderCodeLike());
        }
        if (StringUtils.isNotBlank(req.getStatus())) {
            qw.eq("status", req.getStatus());
        }
        qw.orderByDesc("create_time");
        IPage<SpWorkOrderChange> page = workOrderChangeService.page(req, qw);
        return Result.success(page);
    }

    @ApiOperation("工单变更记录详情")
    @PostMapping("/detail")
    @ResponseBody
    public Result detail(@RequestParam String id) {
        SpWorkOrderChange change = workOrderChangeService.getById(id);
        if (change == null) {
            return Result.failure("变更记录不存在");
        }
        return Result.success(change);
    }
}
