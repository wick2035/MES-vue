package com.wangziyang.mes.realtime;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

/**
 * WebSocket 端点配置。注册实时通知通道 /client/ws/notify。
 *
 * @author wick2035
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    @Autowired
    private NotifyWebSocketHandler notifyWebSocketHandler;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // Spring 5.1 仅提供 setAllowedOrigins；前端经 Vite/反向代理同源接入，放行全部来源即可
        registry.addHandler(notifyWebSocketHandler, "/client/ws/notify")
                .setAllowedOrigins("*");
    }

    /**
     * 显式提供名为 taskScheduler 的调度器。
     * 启用 @EnableScheduling 后，调度器按类型查找 TaskScheduler 时会命中
     * Spring WebSocket 注册的 defaultSockJsTaskScheduler（未启用 SockJS 时为 NullBean），
     * 导致启动报错。提供本 Bean 后按名称 taskScheduler 解析，规避该冲突，
     * 同时供 @Scheduled 通知广播使用。
     */
    @Bean
    public ThreadPoolTaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(2);
        scheduler.setThreadNamePrefix("mes-sched-");
        scheduler.setDaemon(true);
        return scheduler;
    }
}
