package com.maragogi.maragobus.service;

import com.maragogi.maragobus.dto.solicitacaoadvertencia.CriacaoSolicitacaoAdvertenciaRequest;
import com.maragogi.maragobus.entity.*;
import com.maragogi.maragobus.enums.*;
import com.maragogi.maragobus.exception.*;
import com.maragogi.maragobus.repository.*;
import jakarta.validation.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.validation.beanvalidation.MethodValidationInterceptor;
import java.time.*;
import java.util.*;
import java.util.stream.Stream;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SolicitacaoAdvertenciaServiceTest {
    @Mock SolicitacaoAdvertenciaRepository solicitacoes;
    @Mock UsuarioRepository usuarios;
    private static ValidatorFactory validador;
    private final Usuario motorista = Usuario.builder().id(UUID.randomUUID()).nome("Motorista").tipoUsuario(TipoUsuario.MOTORISTA).build();
    private final Usuario aluno = Usuario.builder().id(UUID.randomUUID()).nome("Aluno").tipoUsuario(TipoUsuario.ALUNO).build();
    private final Clock clock = Clock.fixed(Instant.parse("2026-10-12T20:15:30Z"), ZoneOffset.UTC);

    @BeforeAll static void abrir() { validador = Validation.buildDefaultValidatorFactory(); }
    @AfterAll static void fechar() { validador.close(); }
    private SolicitacaoAdvertenciaService direto() { return new SolicitacaoAdvertenciaService(solicitacoes, usuarios, clock); }
    private SolicitacaoAdvertenciaService service() {
        var proxy = new ProxyFactory(direto());
        proxy.addAdvice(new MethodValidationInterceptor(validador.getValidator()));
        return (SolicitacaoAdvertenciaService) proxy.getProxy();
    }
    private void motoristaDisponivel() { when(usuarios.findById(motorista.getId())).thenReturn(Optional.of(motorista)); }
    private void ambosDisponiveis() {
        motoristaDisponivel(); when(usuarios.findById(aluno.getId())).thenReturn(Optional.of(aluno));
    }
    private void salvar() {
        when(solicitacoes.save(any(SolicitacaoAdvertencia.class))).thenAnswer(i -> {
            SolicitacaoAdvertencia s = i.getArgument(0);
            assertNull(s.getId()); assertSame(motorista, s.getMotoristaSolicitante()); assertSame(aluno, s.getAluno());
            assertEquals(StatusSolicitacaoAdvertencia.PENDENTE, s.getStatus());
            assertEquals(LocalDateTime.parse("2026-10-12T17:15:30"), s.getDataHoraSolicitacao());
            assertNull(s.getAdministradorResponsavel()); assertNull(s.getDataHoraAnalise()); assertNull(s.getObservacaoAnalise());
            s.setId(UUID.randomUUID()); return s;
        });
    }

    @ParameterizedTest @ValueSource(strings = {"Motivo", "  Motivo  ", "\tMotivo\n"})
    void deveRegistrarSolicitacaoPendenteComRelacoesHorarioLocalENormalizacao(String motivo) {
        ambosDisponiveis(); salvar();
        var resposta = service().solicitar(motorista.getId(), new CriacaoSolicitacaoAdvertenciaRequest(aluno.getId(), motivo));
        assertNotNull(resposta.id()); assertEquals(motorista.getId(), resposta.motoristaSolicitanteId());
        assertEquals(aluno.getId(), resposta.alunoId()); assertEquals("Motivo", resposta.descricao());
        assertEquals(StatusSolicitacaoAdvertencia.PENDENTE, resposta.status());
        assertEquals(LocalDateTime.parse("2026-10-12T17:15:30"), resposta.dataHoraSolicitacao());
        verify(usuarios).findById(motorista.getId()); verify(usuarios).findById(aluno.getId()); verifyNoMoreInteractions(usuarios);
        verify(solicitacoes).save(any(SolicitacaoAdvertencia.class)); verifyNoMoreInteractions(solicitacoes);
        assertEquals("Aluno", aluno.getNome()); assertTrue(aluno.isAtivo());
        assertEquals("Motorista", motorista.getNome()); assertTrue(motorista.isAtivo());
    }

    @ParameterizedTest @ValueSource(ints = {1, 1000})
    void deveAceitarLimitesValidosDeDescricao(int tamanho) {
        ambosDisponiveis(); salvar(); var motivo = "x".repeat(tamanho);
        assertEquals(motivo, service().solicitar(motorista.getId(), new CriacaoSolicitacaoAdvertenciaRequest(aluno.getId(), motivo)).descricao());
    }

    @ParameterizedTest @ValueSource(strings = {"ausente", "ALUNO", "ADMIN", "inativo"})
    void deveRejeitarMotoristaInvalido(String caso) {
        if (caso.equals("inativo")) motorista.setAtivo(false);
        else if (!caso.equals("ausente")) motorista.setTipoUsuario(TipoUsuario.valueOf(caso));
        when(usuarios.findById(motorista.getId())).thenReturn(caso.equals("ausente") ? Optional.empty() : Optional.of(motorista));
        Class<? extends RuntimeException> erro = caso.equals("ausente") ? RecursoNaoEncontradoException.class : RegraNegocioException.class;
        assertThrows(erro, () -> service().solicitar(motorista.getId(), new CriacaoSolicitacaoAdvertenciaRequest(aluno.getId(), "Motivo")));
        verify(usuarios).findById(motorista.getId()); verifyNoMoreInteractions(usuarios); verifyNoInteractions(solicitacoes);
    }

    @ParameterizedTest @ValueSource(strings = {"ausente", "MOTORISTA", "ADMIN", "inativo"})
    void deveRejeitarAlunoInvalido(String caso) {
        motoristaDisponivel();
        if (caso.equals("inativo")) aluno.setAtivo(false);
        else if (!caso.equals("ausente")) aluno.setTipoUsuario(TipoUsuario.valueOf(caso));
        when(usuarios.findById(aluno.getId())).thenReturn(caso.equals("ausente") ? Optional.empty() : Optional.of(aluno));
        Class<? extends RuntimeException> erro = caso.equals("ausente") ? RecursoNaoEncontradoException.class : RegraNegocioException.class;
        assertThrows(erro, () -> service().solicitar(motorista.getId(), new CriacaoSolicitacaoAdvertenciaRequest(aluno.getId(), "Motivo")));
        verifyNoInteractions(solicitacoes); verify(usuarios, never()).save(any());
    }

    static Stream<String> motivosInvalidos() { return Stream.of(null, "", "  ", "\t\n", "x".repeat(1001)); }

    @ParameterizedTest @MethodSource("motivosInvalidos")
    void deveExecutarConstraintsJakartaDaDescricao(String motivo) {
        assertThrows(ConstraintViolationException.class, () -> service().solicitar(motorista.getId(),
                new CriacaoSolicitacaoAdvertenciaRequest(aluno.getId(), motivo)));
        verifyNoInteractions(usuarios, solicitacoes);
    }

    @ParameterizedTest @MethodSource("motivosInvalidos")
    void deveProtegerInvarianteDaDescricaoMesmoSemProxyDeValidacao(String motivo) {
        assertThrows(RegraNegocioException.class, () -> direto().solicitar(motorista.getId(),
                new CriacaoSolicitacaoAdvertenciaRequest(aluno.getId(), motivo)));
        verifyNoInteractions(usuarios, solicitacoes);
    }

    @ParameterizedTest @ValueSource(strings = {"motorista", "dados", "aluno"})
    void deveValidarIdsERequisicaoObrigatorios(String campo) {
        assertThrows(ConstraintViolationException.class, () -> service().solicitar(campo.equals("motorista") ? null : motorista.getId(),
                campo.equals("dados") ? null : new CriacaoSolicitacaoAdvertenciaRequest(campo.equals("aluno") ? null : aluno.getId(), "Motivo")));
        verifyNoInteractions(usuarios, solicitacoes);
    }

    @Test void devePermitirMultiplasSolicitacoesSemInventarUnicidade() {
        ambosDisponiveis(); salvar(); var dados = new CriacaoSolicitacaoAdvertenciaRequest(aluno.getId(), "Motivo");
        var service = service(); var primeira = service.solicitar(motorista.getId(), dados); var segunda = service.solicitar(motorista.getId(), dados);
        assertNotEquals(primeira.id(), segunda.id());
        verify(solicitacoes, times(2)).save(any(SolicitacaoAdvertencia.class)); verifyNoMoreInteractions(solicitacoes);
    }
}
