package com.nutrition.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

/**
 * System Time & Clock Configuration.
 * Single source of "now" for consultation lifecycles allowing deterministic time mocking in tests.
 */
@Configuration
public class TimeConfig {

    /**
     * Supplies the system default zone Clock bean.
     *
     * @return system default zone Clock instance
     */
    @Bean
    public Clock clock() {
        return Clock.systemDefaultZone();
    }
}
