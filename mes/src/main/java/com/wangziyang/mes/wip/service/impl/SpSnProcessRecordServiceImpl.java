package com.wangziyang.mes.wip.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.order.entity.SpOrder;
import com.wangziyang.mes.order.service.ISpOrderService;
import com.wangziyang.mes.technology.entity.SpFlowOperRelation;
import com.wangziyang.mes.technology.entity.SpOper;
import com.wangziyang.mes.technology.entity.SpProcessRoute;
import com.wangziyang.mes.technology.mapper.SpFlowOperRelationMapper;
import com.wangziyang.mes.technology.service.ISpOperService;
import com.wangziyang.mes.technology.service.ISpProcessRouteService;
import com.wangziyang.mes.wip.entity.SpSnProcessRecord;
import com.wangziyang.mes.wip.mapper.SpSnProcessRecordMapper;
import com.wangziyang.mes.wip.request.SpSnScanReq;
import com.wangziyang.mes.wip.service.ISpSnProcessRecordService;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class SpSnProcessRecordServiceImpl extends ServiceImpl<SpSnProcessRecordMapper, SpSnProcessRecord>
        implements ISpSnProcessRecordService {

    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final int WORK_ORDER_DISPATCHED = 5;
    private static final String WORK_STATUS_STARTED = "STARTED";

    @Autowired
    private ISpOrderService orderService;

    @Autowired
    private ISpOperService operService;

    @Autowired
    private ISpProcessRouteService processRouteService;

    @Autowired
    private SpFlowOperRelationMapper flowOperRelationMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Result scan(SpSnScanReq req) {
        if (req == null || StringUtils.isBlank(req.getSn())) {
            return Result.failure("请输入 SN");
        }
        if (StringUtils.isBlank(req.getOrderId())) {
            return Result.failure("请选择工单");
        }
        String status = StringUtils.defaultIfBlank(req.getStatus(), "OK").toUpperCase(Locale.ENGLISH);
        if (!"OK".equals(status) && !"NG".equals(status)) {
            return Result.failure("采集结果只能是 OK 或 NG");
        }

        SpOrder order = orderService.getById(req.getOrderId());
        if (order == null) {
            return Result.failure("工单不存在");
        }
        if (StringUtils.isBlank(order.getFlowId())) {
            return Result.failure("工单未绑定工艺路线");
        }

        List<SpFlowOperRelation> route = resolveRoute(order);
        if (route.isEmpty()) {
            return Result.failure("工单工艺路线没有配置工序");
        }

        String sn = req.getSn().trim();
        Set<String> completedOperIds = completedOperIds(order.getId(), sn);
        boolean manualOverride = StringUtils.isNotBlank(req.getOperId());
        SpFlowOperRelation current = manualOverride
                ? findRouteOper(route, req.getOperId().trim())
                : nextUnfinishedOper(route, completedOperIds);
        if (current == null) {
            return Result.failure(manualOverride ? "所选工序不属于当前工单路线" : "该 SN 已完成当前工单全部工序");
        }

        if (!manualOverride && "OK".equals(status) && hasOkRecord(order.getId(), sn, current.getOperId())) {
            return Result.failure("该 SN 当前工序已采集 OK，不能重复过站");
        }

        SpSnProcessRecord record = new SpSnProcessRecord();
        record.setSn(sn);
        record.setOrderId(order.getId());
        record.setOrderCode(order.getOrderCode());
        record.setFlowId(order.getFlowId());
        record.setOperId(current.getOperId());
        record.setOper(current.getOper());
        record.setOperDesc(operDesc(current));
        record.setStepNo(current.getSortNum());
        record.setStatus(status);
        record.setRemark(StringUtils.trimToEmpty(req.getRemark()));
        save(record);
        markWorkOrderStarted(order);

        if ("OK".equals(status)) {
            completedOperIds.add(current.getOperId());
        }
        SpFlowOperRelation next = nextUnfinishedOper(route, completedOperIds);

        Map<String, Object> data = new HashMap<>();
        data.put("record", record);
        data.put("complete", next == null);
        data.put("nextOper", next);
        data.put("route", routeStatus(order.getId(), sn));
        return Result.success(data, next == null ? "SN 已完成全部工序" : "采集成功");
    }

    @Override
    public List<Map<String, Object>> routeStatus(String orderId, String sn) {
        SpOrder order = orderService.getById(orderId);
        if (order == null || StringUtils.isBlank(order.getFlowId())) {
            return Collections.emptyList();
        }
        List<SpFlowOperRelation> route = routeByFlowId(order.getFlowId());
        Set<String> completedOperIds = StringUtils.isBlank(sn)
                ? Collections.emptySet()
                : completedOperIds(orderId, sn.trim());
        SpFlowOperRelation current = nextUnfinishedOper(route, completedOperIds);
        return route.stream().map(r -> {
            Map<String, Object> row = new HashMap<>();
            row.put("operId", r.getOperId());
            row.put("oper", r.getOper());
            row.put("operDesc", operDesc(r));
            row.put("stepNo", r.getSortNum());
            row.put("done", completedOperIds.contains(r.getOperId()));
            row.put("current", current != null && StringUtils.equals(current.getOperId(), r.getOperId()));
            return row;
        }).collect(Collectors.toList());
    }

    @Override
    public List<SpFlowOperRelation> route(String orderId) {
        SpOrder order = orderService.getById(orderId);
        if (order == null || StringUtils.isBlank(order.getFlowId())) {
            return Collections.emptyList();
        }
        return routeByFlowId(order.getFlowId());
    }

    private List<SpFlowOperRelation> resolveRoute(SpOrder order) {
        if (order == null || StringUtils.isBlank(order.getFlowId())) {
            return Collections.emptyList();
        }
        return routeByFlowId(order.getFlowId());
    }

    private List<SpFlowOperRelation> routeByFlowId(String flowId) {
        QueryWrapper<SpFlowOperRelation> qw = new QueryWrapper<>();
        qw.eq("flow_id", flowId).orderByAsc("sort_num");
        List<SpFlowOperRelation> relations = flowOperRelationMapper.selectList(qw);
        if (relations != null && !relations.isEmpty()) {
            return relations;
        }
        List<SpProcessRoute> routes = processRouteService.list(new QueryWrapper<SpProcessRoute>()
                .eq("bom_id", flowId)
                .eq("is_deleted", "0")
                .eq("lock_status", "locked")
                .isNotNull("oper_id")
                .ne("oper_id", "")
                .orderByAsc("seq_no")
                .orderByAsc("route_code"));
        if (routes == null || routes.isEmpty()) {
            return Collections.emptyList();
        }
        List<SpFlowOperRelation> fallback = new ArrayList<>();
        int sort = 1;
        for (SpProcessRoute route : routes) {
            SpOper oper = StringUtils.isBlank(route.getOperId()) ? null : operService.getById(route.getOperId());
            SpFlowOperRelation rel = new SpFlowOperRelation();
            rel.setFlowId(flowId);
            rel.setOperId(route.getOperId());
            rel.setOper(oper == null ? route.getOperId() : oper.getOper());
            rel.setSortNum(route.getSeqNo() == null ? sort : route.getSeqNo());
            sort++;
            fallback.add(rel);
        }
        return fallback;
    }

    private SpFlowOperRelation nextUnfinishedOper(List<SpFlowOperRelation> route, Set<String> completedOperIds) {
        if (route == null || route.isEmpty()) {
            return null;
        }
        Set<String> completed = completedOperIds == null ? Collections.emptySet() : completedOperIds;
        return route.stream()
                .filter(r -> StringUtils.isNotBlank(r.getOperId()))
                .filter(r -> !completed.contains(r.getOperId()))
                .findFirst()
                .orElse(null);
    }

    private SpFlowOperRelation findRouteOper(List<SpFlowOperRelation> route, String operId) {
        if (route == null || route.isEmpty() || StringUtils.isBlank(operId)) {
            return null;
        }
        return route.stream()
                .filter(r -> StringUtils.equals(operId, r.getOperId()))
                .findFirst()
                .orElse(null);
    }

    private Set<String> completedOperIds(String orderId, String sn) {
        QueryWrapper<SpSnProcessRecord> qw = new QueryWrapper<>();
        qw.eq("order_id", orderId).eq("sn", sn).eq("status", "OK");
        List<SpSnProcessRecord> records = list(qw);
        if (records == null || records.isEmpty()) {
            return new HashSet<>();
        }
        return records.stream().map(SpSnProcessRecord::getOperId).collect(Collectors.toSet());
    }

    private boolean hasOkRecord(String orderId, String sn, String operId) {
        QueryWrapper<SpSnProcessRecord> qw = new QueryWrapper<>();
        qw.eq("order_id", orderId)
                .eq("sn", sn)
                .eq("oper_id", operId)
                .eq("status", "OK");
        return count(qw) > 0;
    }

    private void markWorkOrderStarted(SpOrder order) {
        if (order == null
                || order.getStatue() == null
                || order.getStatue() != WORK_ORDER_DISPATCHED
                || WORK_STATUS_STARTED.equals(order.getWorkStatus())) {
            return;
        }
        SpOrder update = new SpOrder();
        update.setId(order.getId());
        update.setWorkStatus(WORK_STATUS_STARTED);
        update.setWorkStartTime(LocalDateTime.now().format(DT_FMT));
        orderService.updateById(update);
    }

    private String operDesc(SpFlowOperRelation relation) {
        if (relation == null || StringUtils.isBlank(relation.getOperId())) {
            return "";
        }
        SpOper oper = operService.getById(relation.getOperId());
        return oper == null ? relation.getOper() : oper.getOperDesc();
    }
}
