package com.maragogi.maragobus.integration;

import com.maragogi.maragobus.dto.datasemfuncionamento.CadastroDataSemFuncionamentoRequest;
import com.maragogi.maragobus.entity.Usuario;
import com.maragogi.maragobus.enums.TipoUsuario;
import com.maragogi.maragobus.repository.DataSemFuncionamentoRepository;
import com.maragogi.maragobus.repository.UsuarioRepository;
import com.maragogi.maragobus.service.DataSemFuncionamentoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;

import javax.sql.DataSource;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Import({PostgresTestConfiguration.class, CalendarioPostgresIntegrationTest.RelogioFixo.class})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class CalendarioPostgresIntegrationTest {
    @TestConfiguration(proxyBeanMethods = false)
    static class RelogioFixo {
        @Bean
        @Primary
        Clock clockCalendarioTeste() {
            return Clock.fixed(Instant.parse("2026-10-15T01:00:00Z"), ZoneId.of("America/Maceio"));
        }
    }

    @Autowired private DataSemFuncionamentoService calendario;
    @Autowired private DataSemFuncionamentoRepository datas;
    @Autowired private UsuarioRepository usuarios;
    @Autowired private PlatformTransactionManager transactionManager;
    @Autowired private DataSource dataSource;
    @Autowired private PostgreSQLContainer postgres;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void deveBloquearLeituraConcorrenteAteRollbackEPermitirNovoCadastro() throws Exception {
        try (var conexao = dataSource.getConnection()) {
            assertEquals(postgres.getJdbcUrl(), conexao.getMetaData().getURL());
            assertEquals(postgres.getDatabaseName(), conexao.getCatalog());
        }
        var admin = usuarios.saveAndFlush(Usuario.builder().nome("Administrador")
                .cpf("52998224725").telefone("82999999999").endereco("Rua Teste")
                .email("calendario@example.com").senha("hash-teste").tipoUsuario(TipoUsuario.ADMIN).build());
        var solicitacao = new CadastroDataSemFuncionamentoRequest(LocalDate.of(2026, 10, 14), "Manutencao");
        var transacao = new TransactionTemplate(transactionManager);
        var outraSessao = new TransactionTemplate(transactionManager);
        outraSessao.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        String tentarLockCompartilhado = "select pg_try_advisory_xact_lock_shared(80721, 1)";

        transacao.executeWithoutResult(status -> {
            calendario.cadastrar(admin.getId(), solicitacao);
            assertTrue(datas.existsByData(solicitacao.data()));

            // REQUIRES_NEW usa outra conexao enquanto a primeira ainda detem o lock.
            outraSessao.executeWithoutResult(leitura -> {
                assertEquals(Boolean.FALSE, jdbc.queryForObject(tentarLockCompartilhado, Boolean.class));
                assertFalse(datas.existsByData(solicitacao.data()));
            });
            status.setRollbackOnly();
        });

        outraSessao.executeWithoutResult(status -> {
            assertEquals(Boolean.TRUE, jdbc.queryForObject(tentarLockCompartilhado, Boolean.class));
            assertFalse(datas.existsByData(solicitacao.data()));
        });

        var resposta = calendario.cadastrar(admin.getId(), solicitacao);
        assertEquals(resposta.id(), datas.findByData(solicitacao.data()).orElseThrow().getId());
        assertEquals(LocalDateTime.of(2026, 10, 14, 22, 0), resposta.dataHoraCadastro());
    }
}
