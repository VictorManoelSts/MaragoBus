package com.maragogi.maragobus.service;

import com.maragogi.maragobus.domain.reserva.RegrasTemporaisReserva;
import com.maragogi.maragobus.dto.distribuicao.ItemDistribuicaoRequest;
import com.maragogi.maragobus.dto.distribuicao.PublicarDistribuicaoRequest;
import com.maragogi.maragobus.dto.distribuicao.SalvarDistribuicaoRequest;
import com.maragogi.maragobus.entity.*;
import com.maragogi.maragobus.enums.AcaoAuditoriaDistribuicao;
import com.maragogi.maragobus.enums.StatusDistribuicaoTransporte;
import com.maragogi.maragobus.enums.StatusReserva;
import com.maragogi.maragobus.enums.TipoUsuario;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.*;
import com.maragogi.maragobus.repository.projection.ResumoReservasPorFaculdadePonto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DistribuicaoTransporteServiceTest {

    @Mock DistribuicaoTransporteRepository distribuicoes;
    @Mock ItemDistribuicaoTransporteRepository itensRepository;
    @Mock HistoricoDistribuicaoTransporteRepository historicoRepository;
    @Mock UsuarioRepository usuarios;
    @Mock FaculdadeRepository faculdades;
    @Mock ReservaRepository reservas;
    @Mock DataSemFuncionamentoRepository datasSemFuncionamento;

    private final Usuario motorista1 = Usuario.builder()
            .id(UUID.randomUUID()).nome("Carlos Motorista").tipoUsuario(TipoUsuario.MOTORISTA).build();
    private final Usuario motorista2 = Usuario.builder()
            .id(UUID.randomUUID()).nome("João Motorista").tipoUsuario(TipoUsuario.MOTORISTA).build();
    private final Faculdade faculdadeA = Faculdade.builder().id(UUID.randomUUID()).nome("Faculdade A").build();
    private final Faculdade faculdadeB = Faculdade.builder().id(UUID.randomUUID()).nome("Faculdade B").build();
    private final LocalDate data = LocalDate.of(2026, 10, 14); // quarta-feira

    private DistribuicaoTransporteService service(String agora) {
        Clock clock = Clock.fixed(
                LocalDateTime.parse(agora).atZone(ZoneId.of("America/Maceio")).toInstant(),
                ZoneOffset.UTC
        );
        return new DistribuicaoTransporteService(
                distribuicoes, itensRepository, historicoRepository, usuarios, faculdades,
                reservas, datasSemFuncionamento, new RegrasTemporaisReserva(clock), clock
        );
    }

    @Test
    void deveCriarRascunhoRegistrandoAuditoria() {
        when(usuarios.findById(motorista1.getId())).thenReturn(Optional.of(motorista1));
        when(faculdades.findById(faculdadeA.getId())).thenReturn(Optional.of(faculdadeA));
        when(distribuicoes.findByDataUtilizacaoComLock(data)).thenReturn(Optional.empty());
        when(distribuicoes.saveAndFlush(any(DistribuicaoTransporte.class))).thenAnswer(inv -> {
            DistribuicaoTransporte d = inv.getArgument(0);
            d.setId(UUID.randomUUID());
            d.setVersao(0L);
            return d;
        });
        when(itensRepository.findByDistribuicaoIdOrdenado(any())).thenReturn(List.of(
                ItemDistribuicaoTransporte.builder().faculdade(faculdadeA).motorista(motorista1).build()
        ));

        var req = new SalvarDistribuicaoRequest(data, null,
                List.of(new ItemDistribuicaoRequest(faculdadeA.getId(), motorista1.getId())));

        var resp = service("2026-10-14T10:00:00").salvarRascunho(motorista1.getId(), req);

        assertEquals(StatusDistribuicaoTransporte.RASCUNHO, resp.status());
        assertEquals(1, resp.numeroRevisao());
        assertEquals(0L, resp.versao());
        assertEquals(1, resp.itens().size());
        verify(historicoRepository).save(argThat(h ->
                h.getAcao() == AcaoAuditoriaDistribuicao.CRIACAO && h.getNumeroRevisao() == 1));
    }

    @Test
    void deveRejeitarEdicaoComVersaoObsoleta() {
        when(usuarios.findById(motorista2.getId())).thenReturn(Optional.of(motorista2));
        when(faculdades.findById(faculdadeA.getId())).thenReturn(Optional.of(faculdadeA));

        var existente = DistribuicaoTransporte.builder()
                .id(UUID.randomUUID()).dataUtilizacao(data).versao(2L).numeroRevisao(3).ultimoEditor(motorista1).build();
        when(distribuicoes.findByDataUtilizacaoComLock(data)).thenReturn(Optional.of(existente));

        var req = new SalvarDistribuicaoRequest(data, 1L,
                List.of(new ItemDistribuicaoRequest(faculdadeA.getId(), motorista2.getId())));

        var erro = assertThrows(RegraNegocioException.class,
                () -> service("2026-10-14T10:00:00").salvarRascunho(motorista2.getId(), req));
        assertTrue(erro.getMessage().contains("Conflito de versão"));
        verify(historicoRepository, never()).save(any());
    }

    @Test
    void deveRejeitarFaculdadeDuplicadaNoRascunho() {
        when(usuarios.findById(motorista1.getId())).thenReturn(Optional.of(motorista1));
        when(faculdades.findById(faculdadeA.getId())).thenReturn(Optional.of(faculdadeA));

        var req = new SalvarDistribuicaoRequest(data, null, List.of(
                new ItemDistribuicaoRequest(faculdadeA.getId(), motorista1.getId()),
                new ItemDistribuicaoRequest(faculdadeA.getId(), motorista1.getId())
        ));

        assertThrows(RegraNegocioException.class,
                () -> service("2026-10-14T10:00:00").salvarRascunho(motorista1.getId(), req));
        verify(distribuicoes, never()).saveAndFlush(any());
    }

    @Test
    void deveRejeitarDataSemFuncionamentoOuAposHorarioLimiteOperacional() {
        when(usuarios.findById(motorista1.getId())).thenReturn(Optional.of(motorista1));
        var req = new SalvarDistribuicaoRequest(data, null, List.of());

        // Após 17:00 no próprio dia
        assertThrows(RegraNegocioException.class,
                () -> service("2026-10-14T17:00:00").salvarRascunho(motorista1.getId(), req));

        // Data cadastrada sem funcionamento
        when(datasSemFuncionamento.existsByData(data)).thenReturn(true);
        assertThrows(RegraNegocioException.class,
                () -> service("2026-10-14T10:00:00").salvarRascunho(motorista1.getId(), req));
    }

    @Test
    void deveRejeitarPublicacaoQuandoFaltarCoberturaDeFaculdadeComReservas() {
        when(usuarios.findById(motorista1.getId())).thenReturn(Optional.of(motorista1));
        var dist = DistribuicaoTransporte.builder()
                .id(UUID.randomUUID()).dataUtilizacao(data).versao(0L).numeroRevisao(1).ultimoEditor(motorista1).build();
        when(distribuicoes.findByDataUtilizacaoComLock(data)).thenReturn(Optional.of(dist));
        when(itensRepository.findByDistribuicaoIdOrdenado(dist.getId())).thenReturn(List.of(
                ItemDistribuicaoTransporte.builder().distribuicao(dist).faculdade(faculdadeA).motorista(motorista1).build()
        ));
        when(reservas.resumirPorFaculdadeEPonto(data, StatusReserva.CONFIRMADA)).thenReturn(List.of(
                new ResumoReservasPorFaculdadePonto(faculdadeA.getId(), "Faculdade A", UUID.randomUUID(), "Centro", 3L),
                new ResumoReservasPorFaculdadePonto(faculdadeB.getId(), "Faculdade B", UUID.randomUUID(), "Centro", 2L)
        ));

        var erro = assertThrows(RegraNegocioException.class,
                () -> service("2026-10-14T11:00:00").publicar(motorista1.getId(), new PublicarDistribuicaoRequest(data, 0L)));
        assertTrue(erro.getMessage().contains("Todas as faculdades com reservas confirmadas devem estar cobertas"));
        verify(historicoRepository, never()).save(any());
    }
}