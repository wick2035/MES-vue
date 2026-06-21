package com.wangziyang.mes.warehouse.service.impl;

import com.wangziyang.mes.basedata.entity.SpMaterile;
import com.wangziyang.mes.basedata.service.ISpMaterileService;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.productionorder.entity.SpMaterialInboundRequest;
import com.wangziyang.mes.productionorder.entity.SpMaterialRequirementPlan;
import com.wangziyang.mes.productionorder.service.ISpMaterialInboundRequestService;
import com.wangziyang.mes.productionorder.service.ISpMaterialRequirementPlanService;
import com.wangziyang.mes.system.entity.SysUser;
import com.wangziyang.mes.warehouse.mapper.SpWarehouseRequestMapper;
import com.wangziyang.mes.warehouse.service.ISpWarehouseRequestItemService;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@RunWith(MockitoJUnitRunner.class)
public class SpWarehouseRequestServiceImplTest {

    private SpWarehouseRequestServiceImpl service;

    @Mock
    private ISpMaterialRequirementPlanService materialPlanService;
    @Mock
    private ISpMaterialInboundRequestService planInboundService;
    @Mock
    private ISpMaterileService materileService;
    @Mock
    private ISpWarehouseRequestItemService itemService;
    @Mock
    private SpWarehouseRequestMapper requestMapper;

    private SysUser user;

    @Before
    public void setUp() {
        service = new SpWarehouseRequestServiceImpl();
        ReflectionTestUtils.setField(service, "materialPlanService", materialPlanService);
        ReflectionTestUtils.setField(service, "planInboundService", planInboundService);
        ReflectionTestUtils.setField(service, "materileService", materileService);
        ReflectionTestUtils.setField(service, "itemService", itemService);
        ReflectionTestUtils.setField(service, "baseMapper", requestMapper);
        user = new SysUser();
        user.setUsername("planner");
    }

    @Test
    public void syncPlanInboundRequestsGeneratesReleasedPlansBeforeSyncing() {
        SpMaterialRequirementPlan plan = releasedPlan();
        when(materialPlanService.list(any())).thenReturn(Collections.singletonList(plan));
        when(materialPlanService.generateInboundRequest(eq(Collections.singletonList("plan-1")), eq(user)))
                .thenReturn(Result.success());
        when(planInboundService.list(any())).thenReturn(Collections.<SpMaterialInboundRequest>emptyList());

        Result result = service.syncPlanInboundRequests(user);

        assertEquals(0, result.get("code"));
        verify(materialPlanService).generateInboundRequest(eq(Collections.singletonList("plan-1")), eq(user));
    }

    @Test
    public void syncKittingOutboundRequestsGeneratesReleasedPendingPlans() {
        SpMaterialRequirementPlan plan = releasedPlan();
        when(materialPlanService.list(any())).thenReturn(Collections.singletonList(plan));
        when(materileService.getById("mat-1")).thenReturn(material());
        when(requestMapper.insert(any())).thenReturn(1);
        when(itemService.save(any())).thenReturn(true);
        when(materialPlanService.updateById(any())).thenReturn(true);

        Result result = service.syncKittingOutboundRequests(user);

        assertEquals(0, result.get("code"));
        verify(materialPlanService).refreshInventorySnapshot(eq(Collections.singletonList("plan-1")));

        ArgumentCaptor<SpMaterialRequirementPlan> planCaptor = ArgumentCaptor.forClass(SpMaterialRequirementPlan.class);
        verify(materialPlanService).updateById(planCaptor.capture());
        assertEquals("GENERATED", planCaptor.getValue().getOutboundStatus());
        assertTrue(((List<?>) ((java.util.Map<?, ?>) result.get("data")).get("requestNos")).size() > 0);
    }

    private SpMaterialRequirementPlan releasedPlan() {
        SpMaterialRequirementPlan plan = new SpMaterialRequirementPlan();
        plan.setId("plan-1");
        plan.setProductionOrderId("order-1");
        plan.setProductionOrderNo("PO-001");
        plan.setMaterialId("mat-1");
        plan.setMaterialCode("M-001");
        plan.setMaterialName("Material 001");
        plan.setUnit("PCS");
        plan.setDeliveryStatus("RELEASED");
        plan.setInboundStatus("NONE");
        plan.setOutboundStatus("NONE");
        plan.setGrossRequirement(new BigDecimal("5"));
        plan.setNetRequirement(new BigDecimal("3"));
        plan.setDeleted("0");
        return plan;
    }

    private SpMaterile material() {
        SpMaterile material = new SpMaterile();
        material.setId("mat-1");
        material.setMateriel("M-001");
        material.setMaterielDesc("Material 001");
        material.setUnit("PCS");
        material.setDeleted("0");
        return material;
    }
}
