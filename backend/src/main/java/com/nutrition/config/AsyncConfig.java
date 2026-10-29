package com.nutrition.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.web.client.RestTemplate;

/**
 * Asynchronous Task & HTTP Client Configuration.
 * Configures Spring async processing and registers a shared RestTemplate bean.
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    /**
     * Creates and registers a RestTemplate bean for synchronous REST client requests.
     *
     * @return a new RestTemplate instance
     */
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
