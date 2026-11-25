package com.maragogi.maragobus.domain.reserva;

import com.maragogi.maragobus.domain.suspensao.RegrasTemporaisSuspensao;
import com.maragogi.maragobus.enums.DuracaoSuspensao;
import com.maragogi.maragobus.exception.RegraNegocioException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.*;

class RegrasTemporaisSuspensaoTest {

    private static final ZoneId FUSO = ZoneId.of("America/Maceio");
    private RegrasTemporaisSuspensao regras;

    @BeforeEach
    void setUp() {
        Clock clockFixo = Clock.fixed(Instant.parse("2026-10-07T13:00:00Z"), FUSO);
        RegrasTemporaisReserva regrasReserva = new RegrasTemporaisReserva(clockFixo);
        regras = new RegrasTemporaisSuspensao(regrasReserva);
    }

    @Test
    void deveGerarSuspensaoSomenteEmMultiplosDeTres() {
        assertFalse(regras.deveGerarSuspensao(0));
        assertFalse(regras.deveGerarSuspensao(1));
        assertFalse(regras.deveGerarSuspensao(2));
        assertTrue(regras.deveGerarSuspensao(3));
        assertFalse(regras.deveGerarSuspensao(4));
        assertFalse(regras.deveGerarSuspensao(5));
        assertTrue(regras.deveGerarSuspensao(6));
        assertTrue(regras.deveGerarSuspensao(9));
        assertTrue(regras.deveGerarSuspensao(12));
    }

    @Test
    void deveAceitarAsTresDuracoesEscolhidasPeloAdministrador() {
        assertEquals(DuracaoSuspensao.UM_DIA, regras.validarDuracaoEscolhida(1));
        assertEquals(DuracaoSuspensao.TRES_DIAS, regras.validarDuracaoEscolhida(3));
        assertEquals(DuracaoSuspensao.CINCO_DIAS, regras.validarDuracaoEscolhida(5));
    }

    @Test
    void deveRejeitarDuracaoAusenteOuForaDasOpcoes() {
        for (Integer dias : java.util.Arrays.asList(null, -1, 0, 2, 4, 6)) {
            assertThrows(RegraNegocioException.class, () -> regras.validarDuracaoEscolhida(dias));
        }
    }

    @Test
    void deveIniciarNoDiaSeguinteMesmoQuandoAplicadaAntesDas11() {
        // Quarta-feira 07/10/2026 às 10:59
        LocalDateTime aplicacao = LocalDateTime.of(2026, 10, 7, 10, 59);
        assertEquals(LocalDate.of(2026, 10, 8), regras.calcularDataInicio(aplicacao));
    }

    @Test
    void deveIniciarNoProximoDiaDeTransporteQuandoAplicadaAPartirDas11() {
        // Quarta-feira 07/10/2026 às 11:00 -> Quinta-feira 08/10/2026
        LocalDateTime aplicacaoQuarta = LocalDateTime.of(2026, 10, 7, 11, 0);
        assertEquals(LocalDate.of(2026, 10, 8), regras.calcularDataInicio(aplicacaoQuarta));

        // Sexta-feira 09/10/2026 às 14:30 -> Segunda-feira 12/10/2026
        LocalDateTime aplicacaoSexta = LocalDateTime.of(2026, 10, 9, 14, 30);
        assertEquals(LocalDate.of(2026, 10, 12), regras.calcularDataInicio(aplicacaoSexta));
    }

    @Test
    void deveIniciarNaSegundaQuandoAplicadaNoFimDeSemana() {
        // Sábado 10/10/2026 e Domingo 11/10/2026 -> Segunda-feira 12/10/2026
        assertEquals(LocalDate.of(2026, 10, 12),
                regras.calcularDataInicio(LocalDateTime.of(2026, 10, 10, 9, 0)));
        assertEquals(LocalDate.of(2026, 10, 12),
                regras.calcularDataInicio(LocalDateTime.of(2026, 10, 11, 8, 0)));
    }

    @Test
    void deveCalcularDataFimContandoApenasSegundaASexta() {
        // 1 dia começando na quarta 07/10 -> termina na quarta 07/10
        assertEquals(LocalDate.of(2026, 10, 7),
                regras.calcularDataFim(LocalDate.of(2026, 10, 7), DuracaoSuspensao.UM_DIA));

        // 3 dias começando na quinta 08/10 -> Qui(1), Sex(2), pula Sab/Dom, Seg 12/10(3)
        assertEquals(LocalDate.of(2026, 10, 12),
                regras.calcularDataFim(LocalDate.of(2026, 10, 8), DuracaoSuspensao.TRES_DIAS));

        // 5 dias começando na quarta 07/10 -> Qua(1), Qui(2), Sex(3), pula Sab/Dom, Seg(4), Ter 13/10(5)
        assertEquals(LocalDate.of(2026, 10, 13),
                regras.calcularDataFim(LocalDate.of(2026, 10, 7), DuracaoSuspensao.CINCO_DIAS));
    }

    @Test
    void deveRecusarDataInicioEmFimDeSemana() {
        assertThrows(RegraNegocioException.class,
                () -> regras.calcularDataFim(LocalDate.of(2026, 10, 10), DuracaoSuspensao.UM_DIA));
    }

    @Test
    void deveVerificarSeDataEstaCobertaPeloPeriodoDaSuspensao() {
        LocalDate inicio = LocalDate.of(2026, 10, 8);
        LocalDate fim = LocalDate.of(2026, 10, 12);

        assertFalse(regras.cobreData(inicio, fim, LocalDate.of(2026, 10, 7)));
        assertTrue(regras.cobreData(inicio, fim, LocalDate.of(2026, 10, 8)));
        assertTrue(regras.cobreData(inicio, fim, LocalDate.of(2026, 10, 9)));
        assertTrue(regras.cobreData(inicio, fim, LocalDate.of(2026, 10, 12)));
        assertFalse(regras.cobreData(inicio, fim, LocalDate.of(2026, 10, 13)));
    }
}