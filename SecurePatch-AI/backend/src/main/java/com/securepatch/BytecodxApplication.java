package com.securepatch;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class BytecodxApplication {
    public static void main(String[] args) {
        SpringApplication.run(BytecodxApplication.class, args);
    }
}
