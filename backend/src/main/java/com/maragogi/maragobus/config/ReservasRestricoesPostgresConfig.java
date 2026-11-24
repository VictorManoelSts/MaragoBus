package com.maragogi.maragobus.config;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;

@Configuration
public class ReservasRestricoesPostgresConfig {

    @Bean
    ApplicationRunner garantirIndiceUnicoReservasConfirmadas(DataSource dataSource, JdbcTemplate jdbc) {
        return args -> {
            try (var conexao = dataSource.getConnection()) {
                String banco = conexao.getMetaData().getDatabaseProductName();
                if (banco != null && banco.toLowerCase().contains("postgresql")) {
                    jdbc.execute("""
                            create unique index if not exists uk_reservas_aluno_data_confirmada
                            on reservas (aluno_id, data_utilizacao)
                            where status_reserva = 'CONFIRMADA'
                            """);
                }
            }
        };
    }
}