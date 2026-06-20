package com.wangziyang.mes;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@MapperScan("com.wangziyang.mes.**.mapper*")
public class SparchetypeApplication {

    public static void main(String[] args) {
        SpringApplication.run(SparchetypeApplication.class, args);
    }

}
 