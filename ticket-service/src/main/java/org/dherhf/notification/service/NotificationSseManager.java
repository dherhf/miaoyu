package org.dherhf.notification.service;

import lombok.extern.slf4j.Slf4j;
import org.dherhf.notification.vo.NotificationVO;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * SSE 连接管理器，按 userId 维护活跃的 SseEmitter 列表。
 * <p>
 * sendNotification 写入 DB 后调用 {@link #send} 向对应用户的在线连接推送通知；
 * 定时心跳防止网关/代理因空闲超时断连。
 */
@Slf4j
@Component
public class NotificationSseManager {

    private final ConcurrentHashMap<Long, CopyOnWriteArrayList<SseEmitter>> emitters = new ConcurrentHashMap<>();

    /**
     * 注册一个用户的 SSE 连接，并在完成/超时/异常时自动移除。
     */
    public void register(Long userId, SseEmitter emitter) {
        emitters.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        Runnable removeAction = () -> remove(userId, emitter);
        emitter.onCompletion(removeAction);
        emitter.onTimeout(removeAction);
        emitter.onError(ex -> removeAction.run());

        log.info("[SSE] emitter registered: userId={}, total={}", userId, count(userId));
    }

    /**
     * 向指定用户的所有在线连接推送通知。
     */
    public void send(Long userId, NotificationVO vo) {
        CopyOnWriteArrayList<SseEmitter> list = emitters.get(userId);
        if (list == null || list.isEmpty()) {
            return;
        }
        for (SseEmitter emitter : list) {
            try {
                emitter.send(SseEmitter.event()
                        .name("notification")
                        .data(vo, MediaType.APPLICATION_JSON));
            } catch (IOException | IllegalStateException e) {
                remove(userId, emitter);
                log.debug("[SSE] emitter removed (send failed): userId={}, reason={}", userId, e.getMessage());
            }
        }
    }

    /**
     * 定时心跳：每 30 秒向所有连接发送注释行，防止代理空闲断连。
     */
    @Scheduled(fixedRate = 30_000)
    public void heartbeat() {
        emitters.forEach((userId, list) -> {
            for (SseEmitter emitter : list) {
                try {
                    emitter.send(SseEmitter.event().comment("heartbeat"));
                } catch (IOException | IllegalStateException e) {
                    remove(userId, emitter);
                }
            }
        });
    }

    private void remove(Long userId, SseEmitter emitter) {
        CopyOnWriteArrayList<SseEmitter> list = emitters.get(userId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                emitters.remove(userId, list);
            }
        }
    }

    private int count(Long userId) {
        CopyOnWriteArrayList<SseEmitter> list = emitters.get(userId);
        return list == null ? 0 : list.size();
    }
}
