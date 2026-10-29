package com.maragogi.maragobus.domain.reserva;

import com.maragogi.maragobus.config.RelogioConfig;
import com.maragogi.maragobus.exception.RegraNegocioException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.*;

class RegrasTemporaisReservaTest {
    private static final ZoneId FUSO = ZoneId.of("America/Maceio");
    private static final LocalDate SEGUNDA = LocalDate.of(2026, 10, 12);

    private RegrasTemporaisReserva regras(String agora) {
        Instant instante = LocalDateTime.parse(agora).atZone(FUSO).toInstant();
        // O relógio tem zona UTC de propósito; o domínio precisa convertê-lo para Maceió.
        return new RegrasTemporaisReserva(Clock.fixed(instante, ZoneOffset.UTC));
    }

    @ParameterizedTest
    @CsvSource({"2026-10-12,true", "2026-10-13,true", "2026-10-14,true", "2026-10-15,true",
            "2026-10-16,true", "2026-10-17,false", "2026-10-18,false"})
    void deveIdentificarDiasDeTransporteSemTratarFeriados(String data, boolean permitido) {
        assertEquals(permitido, regras("2026-10-09T17:00:00").ehDiaTransporte(LocalDate.parse(data)));
    }

    @ParameterizedTest
    @CsvSource({"2026-10-12,2026-10-13", "2026-10-15,2026-10-16", "2026-10-16,2026-10-19",
            "2026-10-17,2026-10-19", "2026-10-18,2026-10-19", "2026-12-31,2027-01-01"})
    void deveCalcularProximoDiaEstritamentePosterior(String data, String esperado) {
        assertEquals(LocalDate.parse(esperado), regras("2026-10-09T17:00:00").proximoDiaTransporte(LocalDate.parse(data)));
    }

    @ParameterizedTest
    @CsvSource({"2026-10-12,2026-10-09", "2026-10-13,2026-10-12", "2026-10-17,2026-10-16",
            "2026-10-18,2026-10-16", "2027-01-01,2026-12-31"})
    void deveCalcularDiaAnteriorEstritamenteAnterior(String data, String esperado) {
        assertEquals(LocalDate.parse(esperado), regras("2026-10-09T17:00:00").diaTransporteAnterior(LocalDate.parse(data)));
    }

    @Test
    void deveCalcularJanelasPelaDataDeUtilizacao() {
        var regras = regras("2026-01-01T00:00:00");
        assertAll(() -> assertEquals(LocalDateTime.parse("2026-10-09T17:00:00"), regras.aberturaReserva(SEGUNDA)),
                () -> assertEquals(SEGUNDA.atTime(11, 0), regras.encerramentoReserva(SEGUNDA)),
                () -> assertEquals(SEGUNDA.atTime(16, 0), regras.limiteCancelamento(SEGUNDA)),
                () -> assertEquals(SEGUNDA.atTime(11, 0), regras.limiteAlteracaoPontoEmbarque(SEGUNDA)));
        assertEquals(SEGUNDA.atTime(17, 0), regras.aberturaReserva(SEGUNDA.plusDays(1)));
    }

    @ParameterizedTest
    @CsvSource({"2026-10-09T16:59:59.999999999,false", "2026-10-09T17:00:00,true",
            "2026-10-09T17:00:00.000000001,true", "2026-10-10T00:00:00,true",
            "2026-10-11T23:59:59,true", "2026-10-12T10:59:59.999999999,true",
            "2026-10-12T11:00:00,false", "2026-10-12T11:00:00.000000001,false",
            "2026-10-13T08:00:00,false", "2026-10-08T18:00:00,false"})
    void deveRespeitarAberturaInclusivaEEncerramentoExclusivoParaSegunda(String agora, boolean permitido) {
        assertEquals(permitido, regras(agora).permiteReservar(SEGUNDA));
    }

    @ParameterizedTest
    @CsvSource({"2026-10-13,2026-10-12T16:59:59,false", "2026-10-13,2026-10-12T17:00:00,true",
            "2026-10-13,2026-10-13T11:00:00,false", "2026-10-16,2026-10-15T17:00:00,true",
            "2026-10-19,2026-10-16T16:59:59,false", "2026-10-19,2026-10-16T17:00:00,true",
            "2026-10-12,2026-10-16T08:00:00,false", "2026-10-19,2026-10-12T18:00:00,false"})
    void deveUsarJanelaCorrespondenteADataEscolhida(String utilizacao, String agora, boolean permitido) {
        assertEquals(permitido, regras(agora).permiteReservar(LocalDate.parse(utilizacao)));
    }

    @ParameterizedTest
    @ValueSource(strings = {"2026-10-10", "2026-10-11"})
    void deveRejeitarUtilizacaoNoFimDeSemana(String data) {
        var regras = regras("2026-10-09T17:00:00");
        var utilizacao = LocalDate.parse(data);
        assertAll(() -> assertFalse(regras.permiteReservar(utilizacao)),
                () -> assertFalse(regras.permiteCancelar(utilizacao)),
                () -> assertFalse(regras.permiteAlterarPontoEmbarque(utilizacao)),
                () -> assertThrows(RegraNegocioException.class, () -> regras.aberturaReserva(utilizacao)),
                () -> assertThrows(RegraNegocioException.class, () -> regras.encerramentoReserva(utilizacao)),
                () -> assertThrows(RegraNegocioException.class, () -> regras.limiteCancelamento(utilizacao)),
                () -> assertThrows(RegraNegocioException.class, () -> regras.limiteAlteracaoPontoEmbarque(utilizacao)));
    }

    @ParameterizedTest
    @CsvSource({"2026-10-09T18:00:00,true", "2026-10-11T18:00:00,true",
            "2026-10-12T15:59:59.999999999,true", "2026-10-12T16:00:00,false",
            "2026-10-12T16:00:00.000000001,false", "2026-10-12T17:00:00,false",
            "2026-10-13T08:00:00,false"})
    void devePermitirCancelarSomenteAntesDoPrazoDaDataDeUtilizacao(String agora, boolean permitido) {
        assertEquals(permitido, regras(agora).permiteCancelar(SEGUNDA));
    }

    @ParameterizedTest
    @CsvSource({"2026-10-09T18:00:00,true", "2026-10-11T18:00:00,true",
            "2026-10-12T10:59:59.999999999,true", "2026-10-12T11:00:00,false",
            "2026-10-12T11:00:00.000000001,false", "2026-10-12T12:00:00,false",
            "2026-10-13T08:00:00,false"})
    void devePermitirAlterarPontoSomenteAntesDoPrazoDaDataDeUtilizacao(String agora, boolean permitido) {
        assertEquals(permitido, regras(agora).permiteAlterarPontoEmbarque(SEGUNDA));
    }

    @ParameterizedTest
    @ValueSource(strings = {"UTC", "Asia/Tokyo", "America/Los_Angeles"})
    void deveIgnorarZonaDoRelogioEUsarHorarioDeMaceio(String zona) {
        var abertura = new RegrasTemporaisReserva(Clock.fixed(Instant.parse("2026-10-09T20:00:00Z"), ZoneId.of(zona)));
        var encerramento = new RegrasTemporaisReserva(Clock.fixed(Instant.parse("2026-10-12T14:00:00Z"), ZoneId.of(zona)));
        var cancelamento = new RegrasTemporaisReserva(Clock.fixed(Instant.parse("2026-10-12T19:00:00Z"), ZoneId.of(zona)));
        assertTrue(abertura.permiteReservar(SEGUNDA));
        assertFalse(encerramento.permiteReservar(SEGUNDA));
        assertFalse(encerramento.permiteAlterarPontoEmbarque(SEGUNDA));
        assertTrue(encerramento.permiteCancelar(SEGUNDA));
        assertFalse(cancelamento.permiteCancelar(SEGUNDA));
    }

    @Test
    void deveConfigurarRelogioDaAplicacaoComZonaDeMaceio() {
        assertEquals(FUSO, new RelogioConfig().clock().getZone());
    }

    @Test
    void deveRejeitarParametrosTemporaisNulos() {
        var regras = regras("2026-10-09T17:00:00");
        assertAll(() -> assertThrows(NullPointerException.class, () -> new RegrasTemporaisReserva(null)),
                () -> assertThrows(NullPointerException.class, () -> regras.ehDiaTransporte(null)),
                () -> assertThrows(NullPointerException.class, () -> regras.proximoDiaTransporte(null)),
                () -> assertThrows(NullPointerException.class, () -> regras.diaTransporteAnterior(null)),
                () -> assertThrows(NullPointerException.class, () -> regras.permiteReservar(null)),
                () -> assertThrows(NullPointerException.class, () -> regras.permiteCancelar(null)),
                () -> assertThrows(NullPointerException.class, () -> regras.permiteAlterarPontoEmbarque(null)));
    }
}
