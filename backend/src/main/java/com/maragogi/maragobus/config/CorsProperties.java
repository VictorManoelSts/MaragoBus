package com.maragogi.maragobus.config;

import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@ConfigurationProperties(prefix = "maragobus.cors")
public class CorsProperties {

    /**
     * Lista de origens explicitamente permitidas.
     * Vazia por padrão (fail-closed) para não expor produção sem configuração externa.
     */
    private List<String> allowedOrigins = new ArrayList<>();

    private List<String> allowedMethods = new ArrayList<>(
            List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
    );

    private List<String> allowedHeaders = new ArrayList<>(
            List.of("Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With")
    );

    private List<String> exposedHeaders = new ArrayList<>(
            List.of("Location")
    );

    private boolean allowCredentials = false;

    private long maxAgeSeconds = 3600L;

    @PostConstruct
    public void validar() {
        List<String> origensLimpa = allowedOrigins == null
                ? List.of()
                : allowedOrigins.stream()
                .filter(o -> o != null && !o.isBlank())
                .map(String::trim)
                .toList();

        this.allowedOrigins = new ArrayList<>(origensLimpa);

        boolean contemWildcard = this.allowedOrigins.stream().anyMatch(o -> o.contains("*"));
        if (contemWildcard && allowCredentials) {
            throw new IllegalStateException(
                    "Configuração CORS inválida: não é permitido usar wildcard '*' em allowed-origins com allow-credentials=true."
            );
        }
        if (contemWildcard) {
            throw new IllegalStateException(
                    "Configuração CORS inválida: informe origens explícitas em maragobus.cors.allowed-origins (sem wildcard '*')."
            );
        }
    }
}