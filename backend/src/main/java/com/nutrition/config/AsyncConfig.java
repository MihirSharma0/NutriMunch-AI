package com.nutrition.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

/**
 * Asynchronous Task & HTTP Client Configuration.
 * Configures Spring async processing and registers a shared RestTemplate bean.
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    /**
     * Upper bound, in milliseconds, for opening a TCP connection to an external service.
     * A bare {@code new RestTemplate()} has no timeouts at all, so a single unresponsive
     * third party could pin a request thread indefinitely.
     */
    @Value("${app.http.connect-timeout-ms:5000}")
    private int connectTimeoutMs;

    /**
     * Upper bound, in milliseconds, for waiting on the response once connected.
     * Deliberately generous: AI vision calls can legitimately take tens of seconds.
     */
    @Value("${app.http.read-timeout-ms:60000}")
    private int readTimeoutMs;

    /**
     * Creates and registers a RestTemplate bean for synchronous REST client requests.
     *
     * @return a shared RestTemplate instance with connect and read timeouts applied
     */
    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
        requestFactory.setReadTimeout(Duration.ofMillis(readTimeoutMs));
        return new RestTemplate(requestFactory);
    }
}
