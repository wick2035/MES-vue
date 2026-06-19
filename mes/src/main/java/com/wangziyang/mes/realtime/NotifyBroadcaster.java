package com.wangziyang.mes.realtime;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.wangziyang.mes.realtime.NotifyWebSocketHandler.NotifyMessage;
import com.wangziyang.mes.wip.entity.SpSnProcessRecord;
import com.wangziyang.mes.wip.service.ISpSnProcessRecordService;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 实时通知广播器：定时从真实业务数据（SN 工序采集记录）取材，
 * 通过 WebSocket 向在线客户端推送 MES 动态/预警，体现产线实时性。
 *
 * @author wick2035
 */
@Component
public class NotifyBroadcaster {

    @Autowired
    private NotifyWebSocketHandler handler;

    @Autowired
    private ISpSnProcessRecordService recordService;

    private final AtomicInteger cursor = new AtomicInteger(0);

    @Scheduled(fixedDelay = 12000, initialDelay = 8000)
    public void tick() {
        // 无在线客户端时不查询、不广播，避免无谓开销
        if (handler.onlineCount() == 0) {
            return;
        }
        List<SpSnProcessRecord> recent = recordService.list(
                new QueryWrapper<SpSnProcessRecord>().orderByDesc("create_time").last("limit 30"));
        if (recent == null || recent.isEmpty()) {
            handler.broadcast(NotifyMessage.of("system", "产线心跳", "暂无工序采集动态"));
            return;
        }
        SpSnProcessRecord r = recent.get(Math.abs(cursor.getAndIncrement()) % recent.size());
        String oper = StringUtils.defaultIfBlank(r.getOperDesc(), r.getOper());
        NotifyMessage msg;
        if ("NG".equals(r.getStatus())) {
            msg = NotifyMessage.of("alarm", "工序不良预警",
                    "SN " + r.getSn() + " 在「" + oper + "」工序判定 NG，请及时处理");
        } else {
            msg = NotifyMessage.of("order", "工序采集动态",
                    "SN " + r.getSn() + " 完成「" + oper + "」工序（工单 " + r.getOrderCode() + "）");
        }
        handler.broadcast(msg);
    }
}
