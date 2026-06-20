package com.wangziyang.mes.common.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateDeserializer;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateTimeDeserializer;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalTimeDeserializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateSerializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateTimeSerializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalTimeSerializer;
import com.fasterxml.jackson.module.paramnames.ParameterNamesModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

/**
 * Json 序列化工具配置
 *
 * @author SongPeng
 * @date 2019/8/26
 */
@Configuration
public class JsonConfig {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss");

    /**
     * LocalDateTime默认是不包含时区信息的，会取当前机器时间的时区，其实一般情况下，是没有问题的。
     * <p>
     * 但是当我查询或插入MySQL数据库里的数据时，LocalDateTime 会相差8小时，最后才定位到，原来是使用MySQL5.7版本后，
     * 更新了Springboot配置文件中的驱动设置 driver-class-name: com.mysql.cj.jdbc.Driver，
     * 由此造成 url: jdbc:mysql://127.0.0.1:3306/sparchetype?useUnicode=true&characterEncoding=utf-8&useSSL=false&serverTimezone=GMT
     * 里面的serverTimezone=GMT有问题，经过网上资料的解决方案是将serverTimezone=GMT更改serverTimezone=Hongkong即可
     * 另：采用以上方案前，需要先确定系统时区和数据库时区是否正确
     *
     * @return
     */
    @Bean(name = "objectMapper")
    public ObjectMapper getObjectMapper() {
        ObjectMapper om = new ObjectMapper();
        JavaTimeModule javaTimeModule = new JavaTimeModule();
        javaTimeModule.addSerializer(LocalDateTime.class, new LocalDateTimeSerializer(DATE_TIME_FORMATTER));
        javaTimeModule.addSerializer(LocalDate.class, new LocalDateSerializer(DATE_FORMATTER));
        javaTimeModule.addSerializer(LocalTime.class, new LocalTimeSerializer(TIME_FORMATTER));
        javaTimeModule.addDeserializer(LocalDateTime.class, new LocalDateTimeDeserializer(DATE_TIME_FORMATTER));
        javaTimeModule.addDeserializer(LocalDate.class, new LocalDateDeserializer(DATE_FORMATTER));
        javaTimeModule.addDeserializer(LocalTime.class, new LocalTimeDeserializer(TIME_FORMATTER));
        om.registerModule(javaTimeModule).registerModule(new ParameterNamesModule()).registerModule(new Jdk8Module());
        return om;
    }

}
