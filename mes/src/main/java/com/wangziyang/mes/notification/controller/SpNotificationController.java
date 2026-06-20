package com.wangziyang.mes.notification.controller;

import com.wangziyang.mes.common.BaseController;
import com.wangziyang.mes.common.Result;
import com.wangziyang.mes.notification.entity.SpNotification;
import com.wangziyang.mes.notification.service.ISpNotificationService;
import com.wangziyang.mes.system.entity.SysUser;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 业务通知查询接口（历史/未读/已读）。
 */
@Controller
@RequestMapping("/notification")
public class SpNotificationController extends BaseController {

    @Autowired
    private ISpNotificationService notificationService;

    @ApiOperation("最近通知 + 未读数")
    @PostMapping("/recent")
    @ResponseBody
    public Result recent(@RequestParam(required = false, defaultValue = "30") Integer limit) {
        String userId = currentUserId();
        List<SpNotification> list = notificationService.recent(userId, limit == null ? 30 : limit);
        Map<String, Object> data = new HashMap<>();
        data.put("list", list);
        data.put("unread", notificationService.unreadCount(userId));
        return Result.success(data);
    }

    @ApiOperation("未读数")
    @PostMapping("/unread-count")
    @ResponseBody
    public Result unreadCount() {
        return Result.success(notificationService.unreadCount(currentUserId()));
    }

    @ApiOperation("标记已读")
    @PostMapping("/read")
    @ResponseBody
    public Result read(@RequestParam String id) {
        notificationService.markRead(id);
        return Result.success();
    }

    @ApiOperation("全部标记已读")
    @PostMapping("/read-all")
    @ResponseBody
    public Result readAll() {
        notificationService.markAllRead(currentUserId());
        return Result.success();
    }

    private String currentUserId() {
        try {
            SysUser user = getSysUser();
            return user == null ? null : user.getId();
        } catch (Exception ignore) {
            return null;
        }
    }
}
