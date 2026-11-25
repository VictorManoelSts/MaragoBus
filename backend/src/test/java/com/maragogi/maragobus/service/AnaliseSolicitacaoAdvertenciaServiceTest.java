package com.maragogi.maragobus.service;

import com.maragogi.maragobus.dto.solicitacaoadvertencia.SolicitacaoAdvertenciaPendenteResponse;
import com.maragogi.maragobus.dto.solicitacaoadvertencia.RecusaSolicitacaoAdvertenciaRequest;
import com.maragogi.maragobus.dto.solicitacaoadvertencia.AprovacaoSolicitacaoAdvertenciaRequest;
import com.maragogi.maragobus.entity.Advertencia;
import com.maragogi.maragobus.entity.SolicitacaoAdvertencia;
import com.maragogi.maragobus.entity.Suspensao;
import com.maragogi.maragobus.entity.Usuario;
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
import org.springframework.data.domain.*;
import org.springframework.validation.beanvalidation.MethodValidationInterceptor;
import java.time.*;
import java.util.stream.Stream;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AnaliseSolicitacaoAdvertenciaServiceTest {
    @Mock UsuarioRepository usuarios;
    @Mock SolicitacaoAdvertenciaRepository solicitacoes;
    @Mock AdvertenciaRepository advertencias;
    @Mock SuspensaoService suspensaoService;
    private static ValidatorFactory validador;
    private final Usuario admin = Usuario.builder().id(UUID.randomUUID()).tipoUsuario(TipoUsuario.ADMIN).build();
    private final Usuario aluno = Usuario.builder().id(UUID.randomUUID()).tipoUsuario(TipoUsuario.ALUNO).build();
    private final Usuario motorista = Usuario.builder().id(UUID.randomUUID()).tipoUsuario(TipoUsuario.MOTORISTA).build();
    private final Clock clock = Clock.fixed(Instant.parse("2026-10-12T20:15:30Z"), ZoneOffset.UTC);

    @BeforeAll static void abrir() { validador = Validation.buildDefaultValidatorFactory(); }
    @AfterAll static void fechar() { validador.close(); }

    private AnaliseSolicitacaoAdvertenciaService service() {
        var proxy = new ProxyFactory(new AnaliseSolicitacaoAdvertenciaService(
                usuarios, solicitacoes, advertencias, suspensaoService, clock));
        proxy.addAdvice(new MethodValidationInterceptor(validador.getValidator()));
        return (AnaliseSolicitacaoAdvertenciaService) proxy.getProxy();
    }

    @ParameterizedTest
    @CsvSource({"0,10,25,10", "1,10,25,10", "2,10,25,5", "3,10,25,0", "0,50,51,50", "0,,0,0", "0,,1,1", "0,1,2,1"})
    void deveConsultarPendentesComConteudoIntegralEMetadados(int pagina, Integer tamanho, int total, int quantidade) {
        when(usuarios.findById(admin.getId())).thenReturn(Optional.of(admin));
        var pageable = PageRequest.of(pagina, tamanho == null ? 10 : tamanho);
        var itens = new ArrayList<SolicitacaoAdvertenciaPendenteResponse>();
        for (int i = 0; i < quantidade; i++) itens.add(new SolicitacaoAdvertenciaPendenteResponse(new UUID(0, i),
                UUID.randomUUID(), "Aluno " + i, UUID.randomUUID(), "Motorista " + i, "  Descrição integral\nlinha 2  ",
                LocalDateTime.parse("2020-01-01T09:00:00").plusDays(i), StatusSolicitacaoAdvertencia.PENDENTE));
        when(solicitacoes.consultarPorStatus(StatusSolicitacaoAdvertencia.PENDENTE, pageable)).thenReturn(new PageImpl<>(itens, pageable, total));
        var resposta = service().consultarPendentes(admin.getId(), pagina, tamanho);
        assertEquals(itens, resposta.getContent()); assertEquals(pagina, resposta.getNumber()); assertEquals(pageable.getPageSize(), resposta.getSize());
        assertEquals(total, resposta.getTotalElements()); assertEquals((int) Math.ceil((double) total / pageable.getPageSize()), resposta.getTotalPages());
        assertEquals((long) (pagina + 1) * pageable.getPageSize() < total, resposta.hasNext());
        if (!itens.isEmpty()) {
            assertEquals("Aluno 0", resposta.getContent().getFirst().alunoNome());
            assertEquals("Motorista 0", resposta.getContent().getFirst().motoristaSolicitanteNome());
            assertEquals("  Descrição integral\nlinha 2  ", resposta.getContent().getFirst().descricao());
        }
        verify(solicitacoes).consultarPorStatus(StatusSolicitacaoAdvertencia.PENDENTE, pageable); verifyNoMoreInteractions(solicitacoes);
        verify(usuarios).findById(admin.getId()); verifyNoMoreInteractions(usuarios);
    }

    @ParameterizedTest @CsvSource({"-1,10", "0,0", "0,-1", "0,51", "0,2147483647"})
    void deveRejeitarPaginacaoInvalidaSemConsultarBanco(int pagina, int tamanho) {
        assertThrows(RegraNegocioException.class, () -> service().consultarPendentes(admin.getId(), pagina, tamanho));
        verifyNoInteractions(usuarios, solicitacoes);
    }

    @ParameterizedTest @ValueSource(strings = {"ausente", "ALUNO", "MOTORISTA", "inativo"})
    void deveValidarAdministrador(String caso) {
        if (caso.equals("inativo")) admin.setAtivo(false);
        else if (!caso.equals("ausente")) admin.setTipoUsuario(TipoUsuario.valueOf(caso));
        when(usuarios.findById(admin.getId())).thenReturn(caso.equals("ausente") ? Optional.empty() : Optional.of(admin));
        Class<? extends RuntimeException> erro = caso.equals("ausente") ? RecursoNaoEncontradoException.class : RegraNegocioException.class;
        assertThrows(erro, () -> service().consultarPendentes(admin.getId(), 0, 10));
        verifyNoInteractions(solicitacoes); verify(usuarios, never()).save(any());
    }

    @Test void deveExecutarValidacaoJakartaDoAdministradorObrigatorio() {
        assertThrows(ConstraintViolationException.class, () -> service().consultarPendentes(null, 0, 10));
        verifyNoInteractions(usuarios, solicitacoes);
    }

    private SolicitacaoAdvertencia pendente() {
        return SolicitacaoAdvertencia.builder().id(UUID.randomUUID()).aluno(aluno).motoristaSolicitante(motorista)
                .descricao("  Descrição original\nsem alteração  ").dataHoraSolicitacao(LocalDateTime.parse("2020-01-01T09:00:00")).build();
    }

    private void disponivel(SolicitacaoAdvertencia s) {
        when(usuarios.findById(admin.getId())).thenReturn(Optional.of(admin));
        when(solicitacoes.findByIdParaAnalise(s.getId())).thenReturn(Optional.of(s));
    }

    private void preservarOriginais(SolicitacaoAdvertencia s) {
        assertSame(aluno, s.getAluno()); assertSame(motorista, s.getMotoristaSolicitante());
        assertEquals("  Descrição original\nsem alteração  ", s.getDescricao());
        assertEquals(LocalDateTime.parse("2020-01-01T09:00:00"), s.getDataHoraSolicitacao());
        verify(solicitacoes, never()).save(any()); verify(usuarios, never()).save(any());
    }

    @ParameterizedTest @ValueSource(strings = {"Justificativa", "  Justificativa  ", "\tJustificativa\n"})
    void deveRecusarRegistrandoAnaliseSemModificarDadosOriginais(String motivo) {
        var s = pendente(); disponivel(s); UUID id = s.getId();
        var resposta = service().recusar(admin.getId(), id, new RecusaSolicitacaoAdvertenciaRequest(motivo));
        preservarOriginais(s); assertEquals(id, s.getId()); assertEquals(id, resposta.id());
        assertEquals(StatusSolicitacaoAdvertencia.RECUSADA, s.getStatus()); assertEquals(StatusSolicitacaoAdvertencia.RECUSADA, resposta.status());
        assertSame(admin, s.getAdministradorResponsavel()); assertEquals(admin.getId(), resposta.administradorResponsavelId());
        assertEquals(LocalDateTime.parse("2026-10-12T17:15:30"), s.getDataHoraAnalise());
        assertEquals(s.getDataHoraAnalise(), resposta.dataHoraAnalise());
        assertEquals("Justificativa", s.getObservacaoAnalise()); assertEquals("Justificativa", resposta.observacaoAnalise());
        var ordem = inOrder(usuarios, solicitacoes);
        ordem.verify(usuarios).findById(admin.getId()); ordem.verify(solicitacoes).findByIdParaAnalise(id);
        verifyNoMoreInteractions(usuarios, solicitacoes);
    }

    @ParameterizedTest @ValueSource(strings = {"aluno", "motorista", "ambos"})
    void devePermitirRecusaComUsuariosHistoricosInativos(String inativo) {
        if (!inativo.equals("motorista")) aluno.setAtivo(false);
        if (!inativo.equals("aluno")) motorista.setAtivo(false);
        var s = pendente(); disponivel(s);
        service().recusar(admin.getId(), s.getId(), new RecusaSolicitacaoAdvertenciaRequest("Motivo"));
        assertEquals(StatusSolicitacaoAdvertencia.RECUSADA, s.getStatus()); preservarOriginais(s);
        verify(usuarios).findById(admin.getId()); verifyNoMoreInteractions(usuarios);
    }

    @ParameterizedTest @ValueSource(ints = {1, 1000})
    void deveAceitarLimitesValidosDaJustificativa(int tamanho) {
        var s = pendente(); disponivel(s); String motivo = "x".repeat(tamanho);
        assertEquals(motivo, service().recusar(admin.getId(), s.getId(), new RecusaSolicitacaoAdvertenciaRequest(motivo)).observacaoAnalise());
        preservarOriginais(s);
    }

    @ParameterizedTest @ValueSource(strings = {"ausente", "ALUNO", "MOTORISTA", "inativo"})
    void deveRejeitarAdministradorInvalidoNaRecusa(String caso) {
        if (caso.equals("inativo")) admin.setAtivo(false);
        else if (!caso.equals("ausente")) admin.setTipoUsuario(TipoUsuario.valueOf(caso));
        when(usuarios.findById(admin.getId())).thenReturn(caso.equals("ausente") ? Optional.empty() : Optional.of(admin));
        Class<? extends RuntimeException> erro = caso.equals("ausente") ? RecursoNaoEncontradoException.class : RegraNegocioException.class;
        assertThrows(erro, () -> service().recusar(admin.getId(), UUID.randomUUID(), new RecusaSolicitacaoAdvertenciaRequest("Motivo")));
        verifyNoInteractions(solicitacoes); verify(usuarios, never()).save(any());
    }

    @Test void deveRejeitarSolicitacaoInexistenteNaRecusa() {
        when(usuarios.findById(admin.getId())).thenReturn(Optional.of(admin)); UUID id = UUID.randomUUID();
        when(solicitacoes.findByIdParaAnalise(id)).thenReturn(Optional.empty());
        assertThrows(RecursoNaoEncontradoException.class, () -> service().recusar(admin.getId(), id, new RecusaSolicitacaoAdvertenciaRequest("Motivo")));
        verify(solicitacoes).findByIdParaAnalise(id); verifyNoMoreInteractions(solicitacoes);
    }

    @ParameterizedTest @EnumSource(value = StatusSolicitacaoAdvertencia.class, names = {"APROVADA", "RECUSADA"})
    void naoDeveSobrescreverDecisaoAnterior(StatusSolicitacaoAdvertencia status) {
        var s = pendente(); s.setStatus(status); var anterior = Usuario.builder().id(UUID.randomUUID()).build();
        var horario = LocalDateTime.parse("2021-01-01T09:00:00");
        s.setAdministradorResponsavel(anterior); s.setDataHoraAnalise(horario); s.setObservacaoAnalise("Decisão anterior"); disponivel(s);
        assertThrows(RegraNegocioException.class, () -> service().recusar(admin.getId(), s.getId(), new RecusaSolicitacaoAdvertenciaRequest("Nova decisão")));
        assertEquals(status, s.getStatus()); assertSame(anterior, s.getAdministradorResponsavel());
        assertEquals(horario, s.getDataHoraAnalise()); assertEquals("Decisão anterior", s.getObservacaoAnalise()); preservarOriginais(s);
    }

    static Stream<String> justificativasInvalidas() { return Stream.of(null, "", "  ", "\t\n", "x".repeat(1001)); }

    @ParameterizedTest @MethodSource("justificativasInvalidas")
    void deveExecutarConstraintsJakartaDaRecusa(String motivo) {
        assertThrows(ConstraintViolationException.class, () -> service().recusar(admin.getId(), UUID.randomUUID(), new RecusaSolicitacaoAdvertenciaRequest(motivo)));
        verifyNoInteractions(usuarios, solicitacoes);
    }

    @ParameterizedTest @MethodSource("justificativasInvalidas")
    void deveValidarInvarianteSemProxyEManterSolicitacaoPendente(String motivo) {
        var s = pendente();
        var direto = new AnaliseSolicitacaoAdvertenciaService(usuarios, solicitacoes, advertencias, suspensaoService, clock);
        assertThrows(RegraNegocioException.class, () -> direto.recusar(admin.getId(), s.getId(), new RecusaSolicitacaoAdvertenciaRequest(motivo)));
        assertEquals(StatusSolicitacaoAdvertencia.PENDENTE, s.getStatus()); assertNull(s.getAdministradorResponsavel());
        assertNull(s.getDataHoraAnalise()); assertNull(s.getObservacaoAnalise()); preservarOriginais(s);
        verifyNoInteractions(usuarios, solicitacoes);
    }

    @ParameterizedTest @ValueSource(strings = {"admin", "solicitacao", "dados"})
    void deveValidarParametrosObrigatoriosNaRecusa(String campo) {
        assertThrows(ConstraintViolationException.class, () -> service().recusar(campo.equals("admin") ? null : admin.getId(),
                campo.equals("solicitacao") ? null : UUID.randomUUID(), campo.equals("dados") ? null : new RecusaSolicitacaoAdvertenciaRequest("Motivo")));
        verifyNoInteractions(usuarios, solicitacoes);
    }

    private void emitirAdvertencia(SolicitacaoAdvertencia s) {
        when(usuarios.findByIdParaCriarReserva(s.getAluno().getId())).thenReturn(Optional.of(s.getAluno()));
        when(advertencias.saveAndFlush(any(Advertencia.class))).thenAnswer(i -> {
            Advertencia a = i.getArgument(0);
            assertNull(a.getId()); assertSame(s, a.getSolicitacaoAdvertencia());
            assertEquals(StatusSolicitacaoAdvertencia.APROVADA, s.getStatus());
            assertSame(admin, s.getAdministradorResponsavel());
            assertEquals(LocalDateTime.parse("2026-10-12T17:15:30"), s.getDataHoraAnalise());
            a.setId(UUID.randomUUID()); return a;
        });
        when(suspensaoService.avaliarSuspensaoPendente(any(Advertencia.class)))
                .thenReturn(Optional.empty());
    }

    @ParameterizedTest @NullSource @ValueSource(strings = {"Observação", "  Observação  ", "\tObservação\n"})
    void deveAprovarECriarAdvertenciaVinculadaPreservandoDadosOriginais(String observacao) {
        var s = pendente(); disponivel(s); emitirAdvertencia(s); UUID id = s.getId();
        var resposta = service().aprovar(admin.getId(), id, new AprovacaoSolicitacaoAdvertenciaRequest(observacao));
        preservarOriginais(s); assertEquals(id, s.getId()); assertEquals(id, resposta.id());
        assertEquals(StatusSolicitacaoAdvertencia.APROVADA, s.getStatus()); assertEquals(s.getStatus(), resposta.status());
        assertSame(admin, s.getAdministradorResponsavel()); assertEquals(admin.getId(), resposta.administradorResponsavelId());
        assertEquals(LocalDateTime.parse("2026-10-12T17:15:30"), resposta.dataHoraAnalise());
        assertEquals(observacao == null ? null : "Observação", s.getObservacaoAnalise());
        assertEquals(s.getObservacaoAnalise(), resposta.observacaoAnalise());
        assertNotNull(resposta.advertenciaId()); assertNotEquals(id, resposta.advertenciaId());
        assertNull(resposta.suspensaoId());
        var ordem = inOrder(usuarios, solicitacoes, advertencias, suspensaoService);
        ordem.verify(usuarios).findById(admin.getId());
        ordem.verify(solicitacoes).findByIdParaAnalise(id);
        ordem.verify(usuarios).findByIdParaCriarReserva(aluno.getId());
        ordem.verify(advertencias).saveAndFlush(any(Advertencia.class));
        ordem.verify(suspensaoService).avaliarSuspensaoPendente(any(Advertencia.class));
        verifyNoMoreInteractions(usuarios, solicitacoes, advertencias, suspensaoService);
    }

    @Test
    void deveRetornarSuspensaoIdQuandoAprovacaoGerarSuspensao() {
        var s = pendente(); disponivel(s);
        when(usuarios.findByIdParaCriarReserva(aluno.getId())).thenReturn(Optional.of(aluno));
        when(advertencias.saveAndFlush(any(Advertencia.class))).thenAnswer(i -> {
            Advertencia a = i.getArgument(0);
            a.setId(UUID.randomUUID());
            return a;
        });
        UUID suspensaoId = UUID.randomUUID();
        when(suspensaoService.avaliarSuspensaoPendente(any(Advertencia.class)))
                .thenReturn(Optional.of(Suspensao.builder().id(suspensaoId).build()));

        var resposta = service().aprovar(admin.getId(), s.getId(), new AprovacaoSolicitacaoAdvertenciaRequest("Terceira advertência"));

        assertEquals(suspensaoId, resposta.suspensaoId());
    }

    @ParameterizedTest @ValueSource(ints = {1, 1000})
    void deveAceitarObservacaoDeAprovacaoDentroDoLimite(int tamanho) {
        var s = pendente(); disponivel(s); emitirAdvertencia(s); String texto = "x".repeat(tamanho);
        assertEquals(texto, service().aprovar(admin.getId(), s.getId(), new AprovacaoSolicitacaoAdvertenciaRequest(texto)).observacaoAnalise());
        preservarOriginais(s);
    }

    @ParameterizedTest @ValueSource(strings = {"aluno", "motorista", "ambos"})
    void deveAprovarSolicitacoesComUsuariosHistoricosInativos(String inativo) {
        if (!inativo.equals("motorista")) aluno.setAtivo(false);
        if (!inativo.equals("aluno")) motorista.setAtivo(false);
        var s = pendente(); disponivel(s); emitirAdvertencia(s);
        service().aprovar(admin.getId(), s.getId(), new AprovacaoSolicitacaoAdvertenciaRequest(null));
        preservarOriginais(s); assertEquals(StatusSolicitacaoAdvertencia.APROVADA, s.getStatus());
        verify(usuarios).findById(admin.getId());
        verify(usuarios).findByIdParaCriarReserva(aluno.getId());
        verifyNoMoreInteractions(usuarios);
    }

    @ParameterizedTest @ValueSource(strings = {"ausente", "ALUNO", "MOTORISTA", "inativo"})
    void deveRejeitarAdministradorInvalidoNaAprovacao(String caso) {
        if (caso.equals("inativo")) admin.setAtivo(false);
        else if (!caso.equals("ausente")) admin.setTipoUsuario(TipoUsuario.valueOf(caso));
        when(usuarios.findById(admin.getId())).thenReturn(caso.equals("ausente") ? Optional.empty() : Optional.of(admin));
        Class<? extends RuntimeException> erro = caso.equals("ausente") ? RecursoNaoEncontradoException.class : RegraNegocioException.class;
        assertThrows(erro, () -> service().aprovar(admin.getId(), UUID.randomUUID(), new AprovacaoSolicitacaoAdvertenciaRequest(null)));
        verifyNoInteractions(solicitacoes, advertencias, suspensaoService); verify(usuarios, never()).save(any());
    }

    @Test void deveRejeitarSolicitacaoInexistenteNaAprovacao() {
        when(usuarios.findById(admin.getId())).thenReturn(Optional.of(admin)); UUID id = UUID.randomUUID();
        when(solicitacoes.findByIdParaAnalise(id)).thenReturn(Optional.empty());
        assertThrows(RecursoNaoEncontradoException.class, () -> service().aprovar(admin.getId(), id, new AprovacaoSolicitacaoAdvertenciaRequest(null)));
        verifyNoInteractions(advertencias, suspensaoService); verify(solicitacoes).findByIdParaAnalise(id); verifyNoMoreInteractions(solicitacoes);
    }

    @ParameterizedTest @EnumSource(value = StatusSolicitacaoAdvertencia.class, names = {"APROVADA", "RECUSADA"})
    void deveRejeitarAprovacaoSemSobrescreverDecisaoAnterior(StatusSolicitacaoAdvertencia status) {
        var s = pendente(); s.setStatus(status); var anterior = Usuario.builder().id(UUID.randomUUID()).build();
        var horario = LocalDateTime.parse("2021-01-01T09:00:00");
        s.setAdministradorResponsavel(anterior); s.setDataHoraAnalise(horario); s.setObservacaoAnalise("Anterior"); disponivel(s);
        assertThrows(RegraNegocioException.class, () -> service().aprovar(admin.getId(), s.getId(), new AprovacaoSolicitacaoAdvertenciaRequest("Nova")));
        assertEquals(status, s.getStatus()); assertSame(anterior, s.getAdministradorResponsavel());
        assertEquals(horario, s.getDataHoraAnalise()); assertEquals("Anterior", s.getObservacaoAnalise());
        preservarOriginais(s); verifyNoInteractions(advertencias, suspensaoService);
    }

    static Stream<String> observacoesInvalidas() { return Stream.of("", "  ", "\t\n", "\u2003", "x".repeat(1001)); }

    @ParameterizedTest @MethodSource("observacoesInvalidas")
    void deveExecutarConstraintsJakartaDaObservacaoOpcional(String texto) {
        assertThrows(ConstraintViolationException.class, () -> service().aprovar(admin.getId(), UUID.randomUUID(), new AprovacaoSolicitacaoAdvertenciaRequest(texto)));
        verifyNoInteractions(usuarios, solicitacoes, advertencias, suspensaoService);
    }

    @ParameterizedTest @MethodSource("observacoesInvalidas")
    void deveValidarInvarianteDaObservacaoAntesDeAlterarSolicitacao(String texto) {
        var s = pendente();
        var direto = new AnaliseSolicitacaoAdvertenciaService(usuarios, solicitacoes, advertencias, suspensaoService, clock);
        assertThrows(RegraNegocioException.class, () -> direto.aprovar(admin.getId(), s.getId(), new AprovacaoSolicitacaoAdvertenciaRequest(texto)));
        assertEquals(StatusSolicitacaoAdvertencia.PENDENTE, s.getStatus()); assertNull(s.getAdministradorResponsavel());
        assertNull(s.getDataHoraAnalise()); assertNull(s.getObservacaoAnalise()); preservarOriginais(s);
        verifyNoInteractions(usuarios, solicitacoes, advertencias, suspensaoService);
    }

    @ParameterizedTest @ValueSource(strings = {"admin", "solicitacao", "dados"})
    void deveValidarParametrosObrigatoriosNaAprovacao(String campo) {
        assertThrows(ConstraintViolationException.class, () -> service().aprovar(campo.equals("admin") ? null : admin.getId(),
                campo.equals("solicitacao") ? null : UUID.randomUUID(), campo.equals("dados") ? null : new AprovacaoSolicitacaoAdvertenciaRequest(null)));
        verifyNoInteractions(usuarios, solicitacoes, advertencias, suspensaoService);
    }
}