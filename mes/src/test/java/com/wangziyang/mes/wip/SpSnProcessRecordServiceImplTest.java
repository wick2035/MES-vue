package com.wangziyang.mes.wip;

import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.order.entity.SpOrder;
import com.wangziyang.mes.order.service.ISpOrderService;
import com.wangziyang.mes.technology.entity.SpFlowOperRelation;
import com.wangziyang.mes.technology.entity.SpOper;
import com.wangziyang.mes.technology.mapper.SpFlowOperRelationMapper;
import com.wangziyang.mes.technology.service.ISpOperService;
import com.wangziyang.mes.technology.service.ISpProcessRouteService;
import com.wangziyang.mes.wip.entity.SpSnProcessRecord;
import com.wangziyang.mes.wip.mapper.SpSnProcessRecordMapper;
import com.wangziyang.mes.wip.request.SpSnScanReq;
import com.wangziyang.mes.wip.service.impl.SpSnProcessRecordServiceImpl;
import org.junit.Before;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class SpSnProcessRecordServiceImplTest {

    private SpSnProcessRecordServiceImpl service;
    private ISpOrderService orderService;
    private ISpOperService operService;
    private ISpProcessRouteService processRouteService;
    private SpFlowOperRelationMapper flowOperRelationMapper;
    private SpSnProcessRecordMapper recordMapper;

    @Before
    public void setUp() {
        service = new SpSnProcessRecordServiceImpl();
        orderService = mock(ISpOrderService.class);
        operService = mock(ISpOperService.class);
        processRouteService = mock(ISpProcessRouteService.class);
        flowOperRelationMapper = mock(SpFlowOperRelationMapper.class);
        recordMapper = mock(SpSnProcessRecordMapper.class);

        ReflectionTestUtils.setField(service, "orderService", orderService);
        ReflectionTestUtils.setField(service, "operService", operService);
        ReflectionTestUtils.setField(service, "processRouteService", processRouteService);
        ReflectionTestUtils.setField(service, "flowOperRelationMapper", flowOperRelationMapper);
        ReflectionTestUtils.setField(service, "baseMapper", recordMapper);
    }

    @Test
    public void routeStatusMarksFirstUnfinishedOperationAsCurrent() {
        SpOrder order = order("order-1", "flow-1");
        when(orderService.getById("order-1")).thenReturn(order);
        when(flowOperRelationMapper.selectList(any())).thenReturn(route());
        when(recordMapper.selectList(any())).thenReturn(Collections.singletonList(okRecord("oper-1")));
        when(operService.getById("oper-1")).thenReturn(oper("OP-01", "装配"));
        when(operService.getById("oper-2")).thenReturn(oper("OP-02", "测试"));
        when(operService.getById("oper-3")).thenReturn(oper("OP-03", "包装"));

        List<Map<String, Object>> rows = service.routeStatus("order-1", "SN001");

        assertEquals(3, rows.size());
        assertEquals(Boolean.TRUE, rows.get(0).get("done"));
        assertFalse(Boolean.TRUE.equals(rows.get(0).get("current")));
        assertEquals(Boolean.FALSE, rows.get(1).get("done"));
        assertEquals(Boolean.TRUE, rows.get(1).get("current"));
        assertEquals(Boolean.FALSE, rows.get(2).get("done"));
        assertFalse(Boolean.TRUE.equals(rows.get(2).get("current")));
    }

    @Test
    public void manualOverrideAllowsOkRecordForAlreadyCompletedOperation() {
        SpOrder order = order("order-1", "flow-1");
        order.setOrderCode("WO001");
        when(orderService.getById("order-1")).thenReturn(order);
        when(flowOperRelationMapper.selectList(any())).thenReturn(route());
        when(recordMapper.selectList(any())).thenReturn(Collections.singletonList(okRecord("oper-1")));
        when(recordMapper.insert(any(SpSnProcessRecord.class))).thenReturn(1);
        when(operService.getById("oper-1")).thenReturn(oper("OP-01", "装配"));
        when(operService.getById("oper-2")).thenReturn(oper("OP-02", "测试"));
        when(operService.getById("oper-3")).thenReturn(oper("OP-03", "包装"));

        SpSnScanReq req = new SpSnScanReq();
        req.setOrderId("order-1");
        req.setSn("SN001");
        req.setStatus("OK");
        req.setOperId("oper-1");

        Result result = service.scan(req);

        assertEquals(0, result.get("code"));
        ArgumentCaptor<SpSnProcessRecord> recordCaptor = ArgumentCaptor.forClass(SpSnProcessRecord.class);
        verify(recordMapper).insert(recordCaptor.capture());
        assertEquals("oper-1", recordCaptor.getValue().getOperId());
        verify(recordMapper, never()).selectCount(any());
    }

    private SpOrder order(String id, String flowId) {
        SpOrder order = new SpOrder();
        order.setId(id);
        order.setFlowId(flowId);
        return order;
    }

    private List<SpFlowOperRelation> route() {
        return Arrays.asList(relation("oper-1", "OP-01", 1), relation("oper-2", "OP-02", 2),
                relation("oper-3", "OP-03", 3));
    }

    private SpFlowOperRelation relation(String operId, String oper, Integer sortNum) {
        SpFlowOperRelation relation = new SpFlowOperRelation();
        relation.setFlowId("flow-1");
        relation.setOperId(operId);
        relation.setOper(oper);
        relation.setSortNum(sortNum);
        return relation;
    }

    private SpSnProcessRecord okRecord(String operId) {
        SpSnProcessRecord record = new SpSnProcessRecord();
        record.setOperId(operId);
        record.setStatus("OK");
        return record;
    }

    private SpOper oper(String oper, String operDesc) {
        SpOper item = new SpOper();
        item.setOper(oper);
        item.setOperDesc(operDesc);
        return item;
    }
}
