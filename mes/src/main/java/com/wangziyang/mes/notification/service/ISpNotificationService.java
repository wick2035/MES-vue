package com.wangziyang.mes.notification.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.wangziyang.mes.notification.entity.SpNotification;

import java.util.List;

/**
 * 业务通知服务：落库 + WebSocket 推送。
 */
public interface ISpNotificationService extends IService<SpNotification> {

    String TYPE_ALARM = "alarm";
    String TYPE_ORDER = "order";
    String TYPE_SYSTEM = "system";

    /** 推送一条全员通知（落库并广播） */
    void push(String type, String title, String content, String bizType, String bizId);

    /** 推送一条定向通知（targetUserId 为空则全员） */
    void push(String type, String title, String content, String bizType, String bizId, String targetUserId);

    /** 最近通知（全员 + 定向给该用户），按时间倒序 */
    List<SpNotification> recent(String userId, int limit);

    /** 未读数量 */
    int unreadCount(String userId);

    /** 标记单条已读 */
    void markRead(String id);

    /** 标记该用户可见的全部为已读 */
    void markAllRead(String userId);
}
