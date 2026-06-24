package com.wangziyang.mes.technology.vo;

import java.io.Serializable;
import java.math.BigDecimal;

/**
 * 工艺路线步骤展示 VO
 * <p>
 * 每个步骤引用一道已定义工序，并从工序继承部门/班组/加工单元（只读展示）。
 * </p>
 *
 * @author Claude
 * @since 2026-06-24
 */
public class FlowStepVo implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 工序ID */
    private String operId;
    /** 工序编号 */
    private String oper;
    /** 工序名称 */
    private String operDesc;
    /** 工序工时(h) */
    private BigDecimal operHours;
    /** 制造周期(h) */
    private BigDecimal manuCycle;
    /** 归口部门名称（继承自工序） */
    private String deptName;
    /** 执行班组名称（继承自工序） */
    private String teamName;
    /** 加工单元名称（继承自工序） */
    private String unitName;
    /** 加工单元类型名称（继承自工序） */
    private String unitTypeName;
    /** 排序号 */
    private Integer sortNum;
    /** 工序类型 firstOper/lastOper */
    private String operType;

    public String getOperId() { return operId; }
    public void setOperId(String operId) { this.operId = operId; }

    public String getOper() { return oper; }
    public void setOper(String oper) { this.oper = oper; }

    public String getOperDesc() { return operDesc; }
    public void setOperDesc(String operDesc) { this.operDesc = operDesc; }

    public BigDecimal getOperHours() { return operHours; }
    public void setOperHours(BigDecimal operHours) { this.operHours = operHours; }

    public BigDecimal getManuCycle() { return manuCycle; }
    public void setManuCycle(BigDecimal manuCycle) { this.manuCycle = manuCycle; }

    public String getDeptName() { return deptName; }
    public void setDeptName(String deptName) { this.deptName = deptName; }

    public String getTeamName() { return teamName; }
    public void setTeamName(String teamName) { this.teamName = teamName; }

    public String getUnitName() { return unitName; }
    public void setUnitName(String unitName) { this.unitName = unitName; }

    public String getUnitTypeName() { return unitTypeName; }
    public void setUnitTypeName(String unitTypeName) { this.unitTypeName = unitTypeName; }

    public Integer getSortNum() { return sortNum; }
    public void setSortNum(Integer sortNum) { this.sortNum = sortNum; }

    public String getOperType() { return operType; }
    public void setOperType(String operType) { this.operType = operType; }
}
