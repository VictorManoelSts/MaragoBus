package com.maragogi.maragobus.integration;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.postgresql.PostgreSQLContainer;

@TestConfiguration(proxyBeanMethods = false)
public class PostgresTestConfiguration {
    @Bean
    @ServiceConnection
    PostgreSQLContainer postgres() {
        // Sem volume, porta fixa ou reutilização: destruído ao encerrar o contexto de testes.
        return new PostgreSQLContainer("postgres:15-alpine")
                .withDatabaseName("maragobus_integration_test")
                .withUsername("test_only")
                .withPassword("test_only")
                .withReuse(false);
    }
}
