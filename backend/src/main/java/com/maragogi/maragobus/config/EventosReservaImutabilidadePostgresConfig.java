package com.maragogi.maragobus.config;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;

@Configuration
public class EventosReservaImutabilidadePostgresConfig {

    @Bean
    ApplicationRunner garantirImutabilidadeEventosReserva(DataSource dataSource, JdbcTemplate jdbc) {
        return args -> {
            try (var conexao = dataSource.getConnection()) {
                String banco = conexao.getMetaData().getDatabaseProductName();
                if (banco != null && banco.toLowerCase().contains("postgresql")) {
                    jdbc.execute("""
                            do $$
                            begin
                                if exists (
                                    select 1 from pg_constraint
                                    where conrelid = 'eventos_reserva'::regclass
                                      and conname = 'eventos_reserva_tipo_evento_check'
                                      and pg_get_constraintdef(oid) not like '%CANCELAMENTO_SEM_FUNCIONAMENTO%'
                                ) then
                                    alter table eventos_reserva
                                        drop constraint eventos_reserva_tipo_evento_check,
                                        add constraint eventos_reserva_tipo_evento_check check (
                                            tipo_evento in ('CRIACAO', 'ALTERACAO_PONTO_EMBARQUE',
                                                'CANCELAMENTO_PELO_ALUNO', 'CANCELAMENTO_POR_SUSPENSAO',
                                                'CANCELAMENTO_SEM_FUNCIONAMENTO')
                                        );
                                end if;
                            end $$;
                            """);
                    jdbc.execute("""
                            create or replace function impedir_mutacao_eventos_reserva()
                            returns trigger as $$
                            begin
                                raise exception 'Eventos de reserva são imutáveis e não podem ser alterados ou excluídos.';
                            end;
                            $$ language plpgsql
                            """);
                    jdbc.execute("drop trigger if exists trg_eventos_reserva_imutavel on eventos_reserva");
                    jdbc.execute("""
                            create trigger trg_eventos_reserva_imutavel
                            before update or delete on eventos_reserva
                            for each row execute function impedir_mutacao_eventos_reserva()
                            """);
                }
            }
        };
    }
}