package com.nutrition;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Main Entry Point for the NutriMunch Spring Boot API Application.
 * Enables asynchronous task execution and background scheduled task processing.
 */
@SpringBootApplication
@EnableAsync
@EnableScheduling
public class NutritionApiApplication {

	/**
	 * Bootstraps and launches the Spring Boot application context.
	 *
	 * @param args command-line arguments passed to the application
	 */
	public static void main(String[] args) {
		SpringApplication.run(NutritionApiApplication.class, args);
	}

}
