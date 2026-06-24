package com.wangziyang.mes.technology.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

import java.math.BigDecimal;

/**
 * 工序实体类
 *
 * @author WangZiYang
 * @since 2020-03-14
 */
@TableName(value = "sp_oper")
public class SpOper extends BaseEntity {

    private static final long serialVersionUID = 1L;

    /** 工序编号 GX000001 */
    private String oper;
    /** 工序名称 */
    private String operDesc;
    /** 归口部门ID（sp_sys_department.id） */
    private String deptId;
    /** 执行班组ID（sp_team.id） */
    private String teamId;
    /** 加工单元ID */
    private String unitId;
    /** 工序工时(h) */
    private BigDecimal operHours;
    /** 制造周期(h) */
    private BigDecimal manuCycle;
    /** 是否生成生产计划 Y/N */
    private String genPlan;
    /** 备注信息 */
    private String remark;

    /** 展示字段：部门名称（联表 sp_sys_department.name 回显，不存库） */
    @TableField(exist = false)
    private String deptName;
    /** 展示字段：班组名称（联表 sp_team.team_name 回显，不存库） */
    @TableField(exist = false)
    private String teamName;
    /** 展示字段：加工单元名称（联表 sp_processing_unit.unit_name 回显，不存库） */
    @TableField(exist = false)
    private String unitName;

    public String getOper() { return oper; }
    public void setOper(String oper) { this.oper = oper; }

    public String getOperDesc() { return operDesc; }
    public void setOperDesc(String operDesc) { this.operDesc = operDesc; }

    public String getDeptId() { return deptId; }
    public void setDeptId(String deptId) { this.deptId = deptId; }

    public String getTeamId() { return teamId; }
    public void setTeamId(String teamId) { this.teamId = teamId; }

    public String getUnitId() { return unitId; }
    public void setUnitId(String unitId) { this.unitId = unitId; }

    public BigDecimal getOperHours() { return operHours; }
    public void setOperHours(BigDecimal operHours) { this.operHours = operHours; }

    public BigDecimal getManuCycle() { return manuCycle; }
    public void setManuCycle(BigDecimal manuCycle) { this.manuCycle = manuCycle; }

    public String getGenPlan() { return genPlan; }
    public void setGenPlan(String genPlan) { this.genPlan = genPlan; }

    public String getRemark() { return remark; }
    public void setRemark(String remark) { this.remark = remark; }

    public String getDeptName() { return deptName; }
    public void setDeptName(String deptName) { this.deptName = deptName; }

    public String getTeamName() { return teamName; }
    public void setTeamName(String teamName) { this.teamName = teamName; }

    public String getUnitName() { return unitName; }
    public void setUnitName(String unitName) { this.unitName = unitName; }
}
