package com.maragogi.maragobus.controller;

import com.maragogi.maragobus.domain.reserva.RegrasTemporaisReserva;
import com.maragogi.maragobus.entity.PerfilAluno;
import com.maragogi.maragobus.entity.PontoEmbarque;
import com.maragogi.maragobus.entity.Reserva;
import com.maragogi.maragobus.entity.Usuario;
import com.maragogi.maragobus.enums.StatusReserva;
import com.maragogi.maragobus.enums.TipoUsuario;
import com.maragogi.maragobus.repository.*;
import com.maragogi.maragobus.security.AlunoAutenticado;
import com.maragogi.maragobus.service.EventoReservaService;
import com.maragogi.maragobus.service.ReservaService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.*;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ReservaController.class)
@ActiveProfiles("curso-local")
@Import({ReservaService.class, RegrasTemporaisReserva.class, ReservaControllerTest.RelogioTeste.class})
class ReservaControllerTest {
    private static final String ROTA = "/api/reservas";
    private static final UUID ALUNO = UUID.randomUUID();
    private static final UUID PONTO = UUID.randomUUID();
    private static final UUID ID = UUID.randomUUID();
    private static final LocalDate DATA = LocalDate.of(2026, 10, 12);
    private static final ZoneId FUSO = ZoneId.of("America/Maceio");

    @Autowired private MockMvc mvc;
    @MockitoBean private UsuarioRepository usuarios;
    @MockitoBean private PerfilAlunoRepository perfis;
    @MockitoBean private PontoEmbarqueRepository pontos;
    @MockitoBean private ReservaRepository reservas;
    @MockitoBean private DataSemFuncionamentoRepository calendario;
    @MockitoBean private SuspensaoRepository suspensoes;
    @MockitoBean private EventoReservaService eventos;
    @Autowired private Clock clock;

    @TestConfiguration(proxyBeanMethods = false)
    static class RelogioTeste {
        @Bean
        Clock clock() {
            Clock relogio = mock(Clock.class);
            when(relogio.withZone(FUSO)).thenReturn(relogio);
            when(relogio.getZone()).thenReturn(FUSO);
            return relogio;
        }
    }

    private final Usuario aluno = Usuario.builder().id(ALUNO).ativo(true).tipoUsuario(TipoUsuario.ALUNO).build();
    private final PontoEmbarque ponto = PontoEmbarque.builder().id(PONTO).nome("Ponto fictício").ativo(true).build();

    @BeforeEach
    void preparar() {
        horario("2026-10-12T10:59:59");
        when(usuarios.findById(ALUNO)).thenReturn(Optional.of(aluno));
        when(usuarios.findByIdParaCriarReserva(ALUNO)).thenReturn(Optional.of(aluno));
        when(perfis.findByUsuarioId(ALUNO)).thenReturn(Optional.of(PerfilAluno.builder().build()));
        when(pontos.findById(PONTO)).thenReturn(Optional.of(ponto));
        when(reservas.saveAndFlush(any(Reserva.class))).thenAnswer(invocacao -> {
            Reserva salva = invocacao.getArgument(0);
            salva.setId(ID);
            when(reservas.findByAlunoIdAndDataUtilizacaoAndStatusReserva(ALUNO, DATA, StatusReserva.CONFIRMADA))
                    .thenReturn(Optional.of(salva));
            return salva;
        });
    }

    @Test
    void criaAs17hComDataDoServidorEConsultaProximaEAtual() throws Exception {
        horario("2026-10-09T17:00:00");
        mvc.perform(post(ROTA).with(identidade(ALUNO, "ALUNO")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"pontoEmbarqueId\":\"%s\",\"dataUtilizacao\":\"2099-01-01\"}".formatted(PONTO)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.dataUtilizacao").value(DATA.toString()));
        criar().andExpect(status().isOk()).andExpect(jsonPath("$.id").value(ID.toString()));
        verify(reservas, times(1)).saveAndFlush(any(Reserva.class));
        verify(eventos, times(1)).registrarCriacao(any(), eq(aluno), any());
        mvc.perform(get(ROTA + "/atual").with(identidade(ALUNO, "ALUNO")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.proximaReserva.statusReserva").value("CONFIRMADA"));
        horario("2026-10-12T10:00:00");
        mvc.perform(get(ROTA + "/atual").with(identidade(ALUNO, "ALUNO")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.reservaAtual.id").value(ID.toString()));
    }

    @Test
    void consultaHistoricoPaginadoSomenteDoAluno() throws Exception {
        when(reservas.findByAlunoId(eq(ALUNO), any(Pageable.class))).thenAnswer(invocacao ->
                new PageImpl<>(List.of(reserva(aluno)), invocacao.getArgument(1), 3));
        mvc.perform(get(ROTA + "/historico").param("page", "1").param("size", "1")
                        .param("alunoId", UUID.randomUUID().toString()).with(identidade(ALUNO, "ALUNO")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content[0].id").value(ID.toString()))
                .andExpect(jsonPath("$.page.number").value(1)).andExpect(jsonPath("$.page.totalElements").value(3));
    }

    @Test
    void alteraAntesDas11ECancelaAntesDas16SemRepetirEvento() throws Exception {
        Reserva confirmada = reserva(aluno);
        when(reservas.findLockedById(ID)).thenReturn(Optional.of(confirmada));
        mvc.perform(patch(ROTA + "/{id}/ponto", ID).with(identidade(ALUNO, "ALUNO")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(corpo()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.pontoEmbarqueId").value(PONTO.toString()));
        horario("2026-10-12T15:59:59");
        cancelar("ALUNO").andExpect(status().isOk())
                .andExpect(jsonPath("$.statusReserva").value("CANCELADA_PELO_ALUNO"));
        horario("2026-10-12T16:00:00");
        cancelar("ALUNO").andExpect(status().isOk()).andExpect(jsonPath("$.dataHoraCancelamento").value("2026-10-12T15:59:59"));
        verify(eventos, times(1)).registrarCancelamentoPeloAluno(eq(confirmada), eq(aluno), isNull(), any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"2026-10-09T16:59:59", "2026-10-12T11:00:00"})
    void recusaCriacaoForaDaJanela(String agora) throws Exception {
        horario(agora);
        criar().andExpect(status().isConflict());
        verifyNoInteractions(eventos);
    }

    @Test
    void recusaAlteracaoAs11ECancelamentoAs16() throws Exception {
        when(reservas.findLockedById(ID)).thenReturn(Optional.of(reserva(aluno)));
        horario("2026-10-12T11:00:00");
        mvc.perform(patch(ROTA + "/{id}/ponto", ID).with(identidade(ALUNO, "ALUNO")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(corpo())).andExpect(status().isConflict());
        horario("2026-10-12T16:00:00");
        cancelar("ALUNO").andExpect(status().isConflict());
        verifyNoInteractions(eventos);
    }

    @Test
    void respeitaCalendarioSuspensaoEPontoInativo() throws Exception {
        horario("2026-10-09T17:00:00");
        when(calendario.findDatasAPartirDe(LocalDate.of(2026, 10, 9))).thenReturn(Set.of(DATA));
        LocalDate terca = DATA.plusDays(1);
        when(suspensoes.existsSuspensaoVigenteParaData(ALUNO, terca)).thenReturn(true);
        criar().andExpect(status().isConflict()).andExpect(jsonPath("$.detail").value(
                "O aluno está suspenso para a data de utilização informada."));
        when(suspensoes.existsSuspensaoVigenteParaData(ALUNO, terca)).thenReturn(false);
        ponto.setAtivo(false);
        criar().andExpect(status().isConflict()).andExpect(jsonPath("$.detail").value("O ponto de embarque está inativo."));
        verifyNoInteractions(eventos);
    }

    @Test
    void validaEntradaETrataReservaInexistente() throws Exception {
        mvc.perform(post(ROTA).with(identidade(ALUNO, "ALUNO")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isBadRequest());
        mvc.perform(get(ROTA + "/historico").param("size", "51").with(identidade(ALUNO, "ALUNO")))
                .andExpect(status().isBadRequest());
        mvc.perform(post(ROTA + "/invalido/cancelamento").with(identidade(ALUNO, "ALUNO")).with(csrf()))
                .andExpect(status().isBadRequest());
        cancelar("ALUNO").andExpect(status().isNotFound());
    }

    @Test
    void protegeReservaDeOutroAluno() throws Exception {
        when(reservas.findLockedById(ID)).thenReturn(Optional.of(reserva(Usuario.builder().id(UUID.randomUUID()).build())));
        cancelar("ALUNO").andExpect(status().isNotFound());
        mvc.perform(patch(ROTA + "/{id}/ponto", ID).with(identidade(ALUNO, "ALUNO")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(corpo())).andExpect(status().isNotFound());
        verifyNoInteractions(eventos);
    }

    @ParameterizedTest
    @ValueSource(strings = {"ADMIN", "MOTORISTA"})
    void proibeCancelamentoPorOutrosPapeis(String papel) throws Exception {
        cancelar(papel).andExpect(status().isForbidden());
        verifyNoInteractions(usuarios, reservas, eventos);
    }

    @Test
    void exigeIdentidadeVinculadaEAutenticacao() throws Exception {
        mvc.perform(get(ROTA + "/atual").accept(MediaType.APPLICATION_JSON)).andExpect(status().isUnauthorized());
        mvc.perform(get(ROTA + "/atual").with(user(ALUNO.toString()).roles("ALUNO")))
                .andExpect(status().isForbidden());
        verifyNoInteractions(usuarios);
    }

    private void horario(String agora) {
        when(clock.instant()).thenReturn(LocalDateTime.parse(agora).atZone(FUSO).toInstant());
    }

    private Reserva reserva(Usuario dono) {
        return Reserva.builder().id(ID).aluno(dono).pontoEmbarque(ponto).dataUtilizacao(DATA)
                .statusReserva(StatusReserva.CONFIRMADA).dataHoraReserva(DATA.minusDays(3).atTime(17, 0)).build();
    }

    private org.springframework.test.web.servlet.ResultActions criar() throws Exception {
        return mvc.perform(post(ROTA).with(identidade(ALUNO, "ALUNO")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(corpo()));
    }

    private org.springframework.test.web.servlet.ResultActions cancelar(String papel) throws Exception {
        return mvc.perform(post(ROTA + "/{id}/cancelamento", ID).with(identidade(ALUNO, papel)).with(csrf()));
    }

    private String corpo() {
        return "{\"pontoEmbarqueId\":\"%s\"}".formatted(PONTO);
    }

    private RequestPostProcessor identidade(UUID id, String papel) {
        return authentication(UsernamePasswordAuthenticationToken.authenticated(
                new AlunoAutenticado(id), null, List.of(new SimpleGrantedAuthority("ROLE_" + papel))));
    }
}
