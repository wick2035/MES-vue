package com.wangziyang.mes.realtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.concurrent.CopyOnWriteArraySet;

/**
 * 实时通知 WebSocket 处理器：维护在线会话并向全部客户端广播 MES 事件通知。
 * 端点注册在 /client/ws/notify（Shiro anon 放行，免握手鉴权）。
 *
 * @author wick2035
 */
@Component
public class NotifyWebSocketHandler extends TextWebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(NotifyWebSocketHandler.class);

    private final CopyOnWriteArraySet<WebSocketSession> sessions = new CopyOnWriteArraySet<>();

    @Autowired
    private ObjectMapper objectMapper;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.add(session);
        logger.info("WS 连接建立，当前在线 {}", sessions.size());
        send(session, NotifyMessage.of("system", "连接成功", "已接入实时通知通道，在线设备 " + sessions.size() + " 台"));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
        logger.info("WS 连接关闭，当前在线 {}", sessions.size());
    }

    /** 向全部在线会话广播一条通知 */
    public void broadcast(NotifyMessage message) {
        if (sessions.isEmpty()) {
            return;
        }
        String payload;
        try {
            payload = objectMapper.writeValueAsString(message);
        } catch (Exception e) {
            logger.warn("通知序列化失败", e);
            return;
        }
        TextMessage text = new TextMessage(payload);
        for (WebSocketSession session : sessions) {
            sendRaw(session, text);
        }
    }

    public int onlineCount() {
        return sessions.size();
    }

    private void send(WebSocketSession session, NotifyMessage message) {
        try {
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(message)));
        } catch (IOException e) {
            logger.warn("发送通知失败", e);
        }
    }

    private void sendRaw(WebSocketSession session, TextMessage text) {
        try {
            if (session.isOpen()) {
                session.sendMessage(text);
            }
        } catch (IOException e) {
            logger.warn("广播通知失败", e);
        }
    }

    /** 通知消息体 */
    public static class NotifyMessage {
        private String id;
        private String type;
        private String title;
        private String content;
        private String time;

        public static NotifyMessage of(String type, String title, String content) {
            return of(String.valueOf(System.nanoTime()), type, title, content);
        }

        public static NotifyMessage of(String id, String type, String title, String content) {
            NotifyMessage m = new NotifyMessage();
            m.id = id;
            m.type = type;
            m.title = title;
            m.content = content;
            m.time = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date());
            return m;
        }

        public String getId() { return id; }
        public String getType() { return type; }
        public String getTitle() { return title; }
        public String getContent() { return content; }
        public String getTime() { return time; }
    }
}
