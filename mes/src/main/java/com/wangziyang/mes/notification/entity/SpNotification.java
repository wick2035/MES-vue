package com.wangziyang.mes.notification.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wangziyang.mes.common.BaseEntity;

/**
 * 业务通知（事件驱动）。
 * 由真实业务事件（工序 NG、订单提交/审批、工单下达/完工/交付、库存预警等）产生并落库，
 * 同时通过 WebSocket 推送在线客户端。
 *
 * @author wick2035
 */
@TableName("sp_notification")
public class SpNotification extends BaseEntity {

    private static final long serialVersionUID = 1L;

    /** 类型：alarm 预警 / order 业务动态 / system 系统 */
    private String type;
    private String title;
    private String content;
    /** 业务类型，如 SN_NG / PRODUCTION_ORDER / WORK_ORDER / INVENTORY */
    private String bizType;
    /** 业务主键 */
    private String bizId;
    /** 目标用户ID；为空表示全员广播 */
    private String targetUserId;
    /** 是否已读 0未读 / 1已读 */
    @TableField("is_read")
    private String isRead;

    @TableField("is_deleted")
    private String deleted;

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getBizType() { return bizType; }
    public void setBizType(String bizType) { this.bizType = bizType; }
    public String getBizId() { return bizId; }
    public void setBizId(String bizId) { this.bizId = bizId; }
    public String getTargetUserId() { return targetUserId; }
    public void setTargetUserId(String targetUserId) { this.targetUserId = targetUserId; }
    public String getIsRead() { return isRead; }
    public void setIsRead(String isRead) { this.isRead = isRead; }
    public String getDeleted() { return deleted; }
    public void setDeleted(String deleted) { this.deleted = deleted; }
}
