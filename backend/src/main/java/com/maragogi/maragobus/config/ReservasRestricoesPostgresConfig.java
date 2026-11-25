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
                            do $$
                            begin
                                if exists (
                                    select 1 from pg_constraint
                                    where conrelid = 'reservas'::regclass
                                      and conname = 'reservas_status_reserva_check'
                                      and pg_get_constraintdef(oid) not like '%CANCELADA_POR_PONTO_INATIVO%'
                                ) then
                                    alter table reservas
                                        drop constraint reservas_status_reserva_check,
                                        add constraint reservas_status_reserva_check check (
                                            status_reserva in ('CONFIRMADA', 'CANCELADA_PELO_ALUNO',
                                                'CANCELADA_POR_SUSPENSAO', 'CANCELADA_SEM_FUNCIONAMENTO',
                                                'CANCELADA_POR_PONTO_INATIVO'));
                                end if;
                            end $$;
                            """);
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
