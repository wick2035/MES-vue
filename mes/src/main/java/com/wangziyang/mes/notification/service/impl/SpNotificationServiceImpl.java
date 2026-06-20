package com.wangziyang.mes.notification.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangziyang.mes.notification.entity.SpNotification;
import com.wangziyang.mes.notification.mapper.SpNotificationMapper;
import com.wangziyang.mes.notification.service.ISpNotificationService;
import com.wangziyang.mes.realtime.NotifyWebSocketHandler;
import com.wangziyang.mes.realtime.NotifyWebSocketHandler.NotifyMessage;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 业务通知服务实现：先落库（可追溯/支持历史与未读），再 WebSocket 广播在线客户端。
 */
@Service
public class SpNotificationServiceImpl extends ServiceImpl<SpNotificationMapper, SpNotification>
        implements ISpNotificationService {

    private static final Logger logger = LoggerFactory.getLogger(SpNotificationServiceImpl.class);

    @Autowired
    private NotifyWebSocketHandler handler;

    @Override
    public void push(String type, String title, String content, String bizType, String bizId) {
        push(type, title, content, bizType, bizId, null);
    }

    @Override
    public void push(String type, String title, String content, String bizType, String bizId, String targetUserId) {
        try {
            SpNotification entity = new SpNotification();
            entity.setType(StringUtils.defaultIfBlank(type, TYPE_SYSTEM));
            entity.setTitle(title);
            entity.setContent(content);
            entity.setBizType(bizType);
            entity.setBizId(bizId);
            entity.setTargetUserId(targetUserId);
            entity.setIsRead("0");
            entity.setDeleted("0");
            save(entity);
            // 广播（id 与落库一致，便于前端去重）
            handler.broadcast(NotifyMessage.of(entity.getId(), entity.getType(), title, content));
        } catch (Exception e) {
            // 通知失败不应影响主业务
            logger.warn("推送通知失败：{}", e.getMessage());
        }
    }

    @Override
    public List<SpNotification> recent(String userId, int limit) {
        int size = limit <= 0 ? 30 : Math.min(limit, 100);
        QueryWrapper<SpNotification> qw = new QueryWrapper<>();
        qw.ne("is_deleted", "1");
        qw.and(w -> {
            w.isNull("target_user_id").or().eq("target_user_id", "");
            if (StringUtils.isNotBlank(userId)) {
                w.or().eq("target_user_id", userId);
            }
        });
        qw.orderByDesc("create_time").last("limit " + size);
        return list(qw);
    }

    @Override
    public int unreadCount(String userId) {
        QueryWrapper<SpNotification> qw = new QueryWrapper<>();
        qw.ne("is_deleted", "1").eq("is_read", "0");
        qw.and(w -> {
            w.isNull("target_user_id").or().eq("target_user_id", "");
            if (StringUtils.isNotBlank(userId)) {
                w.or().eq("target_user_id", userId);
            }
        });
        return (int) count(qw);
    }

    @Override
    public void markRead(String id) {
        if (StringUtils.isBlank(id)) {
            return;
        }
        update(new UpdateWrapper<SpNotification>().eq("id", id).set("is_read", "1"));
    }

    @Override
    public void markAllRead(String userId) {
        UpdateWrapper<SpNotification> uw = new UpdateWrapper<>();
        uw.eq("is_read", "0").ne("is_deleted", "1");
        uw.and(w -> {
            w.isNull("target_user_id").or().eq("target_user_id", "");
            if (StringUtils.isNotBlank(userId)) {
                w.or().eq("target_user_id", userId);
            }
        });
        uw.set("is_read", "1");
        update(uw);
    }
}
