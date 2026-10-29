package com.maragogi.maragobus.service;

import com.maragogi.maragobus.domain.reserva.RegrasTemporaisReserva;
import com.maragogi.maragobus.dto.reserva.CriacaoReservaRequest;
import com.maragogi.maragobus.dto.reserva.AtualizacaoPontoEmbarqueReservaRequest;
import com.maragogi.maragobus.dto.reserva.ReservaResponse;
import com.maragogi.maragobus.dto.reserva.PainelReservasAlunoResponse;
import com.maragogi.maragobus.dto.reserva.ConfirmacaoProximaReservaResponse;
import org.springframework.dao.IncorrectResultSizeDataAccessException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.slf4j.LoggerFactory;
import com.maragogi.maragobus.entity.Reserva;
import com.maragogi.maragobus.enums.StatusReserva;
import com.maragogi.maragobus.enums.TipoUsuario;
import com.maragogi.maragobus.exception.RecursoNaoEncontradoException;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.PerfilAlunoRepository;
import com.maragogi.maragobus.repository.PontoEmbarqueRepository;
import com.maragogi.maragobus.repository.ReservaRepository;
import com.maragogi.maragobus.repository.UsuarioRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.UUID;

@Service
@Validated
public class ReservaService {
    private static final org.slf4j.Logger log = LoggerFactory.getLogger(ReservaService.class);
    private final UsuarioRepository usuarioRepository;
    private final PerfilAlunoRepository perfilAlunoRepository;
    private final ReservaRepository reservaRepository;
    private final PontoEmbarqueRepository pontoEmbarqueRepository;
    private final RegrasTemporaisReserva regrasTemporais;
    private final Clock clock;

    public ReservaService(UsuarioRepository usuarioRepository, PerfilAlunoRepository perfilAlunoRepository,
                          ReservaRepository reservaRepository, PontoEmbarqueRepository pontoEmbarqueRepository,
                          RegrasTemporaisReserva regrasTemporais, Clock clock) {
        this.usuarioRepository = usuarioRepository;
        this.perfilAlunoRepository = perfilAlunoRepository;
        this.reservaRepository = reservaRepository;
        this.pontoEmbarqueRepository = pontoEmbarqueRepository;
        this.regrasTemporais = regrasTemporais;
        this.clock = clock.withZone(ZoneId.of("America/Maceio"));
    }

    // O UUID é um argumento interno, não uma autorização. Autenticação e suspensões estão pendentes.
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ReservaResponse cadastrar(@NotNull UUID alunoId, @Valid @NotNull CriacaoReservaRequest dados) {
        var aluno = usuarioRepository.findByIdParaCriarReserva(alunoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));
        if (aluno.getTipoUsuario() != TipoUsuario.ALUNO) {
            throw new RegraNegocioException("Somente alunos podem criar reservas.");
        }
        if (!aluno.isAtivo()) {
            throw new RegraNegocioException("O aluno está inativo.");
        }
        var perfil = perfilAlunoRepository.findByUsuarioId(alunoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Perfil de aluno não encontrado."));
        var ponto = perfil.getPontoEmbarquePadrao();
        if (ponto == null) {
            throw new RegraNegocioException("O aluno não possui ponto de embarque padrão.");
        }
        if (!ponto.isAtivo()) {
            throw new RegraNegocioException("O ponto de embarque está inativo.");
        }
        if (!regrasTemporais.permiteReservar(dados.dataUtilizacao())) {
            throw new RegraNegocioException("A data de utilização ou o horário está fora da janela de reservas.");
        }
        if (reservaRepository.existsByAlunoIdAndDataUtilizacaoAndStatusReserva(
                alunoId, dados.dataUtilizacao(), StatusReserva.CONFIRMADA)) {
            throw new RegraNegocioException("Já existe uma reserva confirmada para este aluno e data.");
        }
        var reserva = Reserva.builder().aluno(aluno).pontoEmbarque(ponto).dataUtilizacao(dados.dataUtilizacao())
                .dataHoraReserva(LocalDateTime.now(clock)).statusReserva(StatusReserva.CONFIRMADA)
                .dataHoraCancelamento(null).build();
        var salva = reservaRepository.save(reserva);
        return new ReservaResponse(salva.getId(), salva.getAluno().getId(), salva.getDataUtilizacao(),
                salva.getDataHoraReserva(), salva.getStatusReserva(),
                salva.getPontoEmbarque().getId(), salva.getPontoEmbarque().getNome(), salva.getDataHoraCancelamento());
    }

    // A identidade autenticada deverá fornecer alunoId futuramente.
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ReservaResponse cancelar(@NotNull UUID alunoId, @NotNull UUID reservaId) {
        // Mesma ordem da criação: lock do aluno antes de consultar ou alterar reservas.
        var aluno = usuarioRepository.findByIdParaCriarReserva(alunoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));
        if (aluno.getTipoUsuario() != TipoUsuario.ALUNO) {
            throw new RegraNegocioException("Somente alunos podem cancelar reservas.");
        }
        if (!aluno.isAtivo()) {
            throw new RegraNegocioException("O aluno está inativo.");
        }
        var reserva = reservaRepository.findById(reservaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Reserva não encontrada."));
        if (!reserva.getAluno().getId().equals(alunoId)) {
            throw new RegraNegocioException("A reserva não pertence ao aluno solicitante.");
        }
        if (reserva.getStatusReserva() != StatusReserva.CONFIRMADA) {
            throw new RegraNegocioException("Somente reservas confirmadas podem ser canceladas.");
        }
        LocalDateTime agora = LocalDateTime.now(clock);
        if (reserva.getDataHoraReserva().isAfter(agora)) {
            throw new RegraNegocioException("A reserva não pode ser cancelada antes de sua criação.");
        }
        if (!regrasTemporais.permiteCancelar(reserva.getDataUtilizacao())) {
            throw new RegraNegocioException("O horário está fora do prazo de cancelamento da reserva.");
        }
        reserva.setStatusReserva(StatusReserva.CANCELADA_PELO_ALUNO);
        reserva.setDataHoraCancelamento(agora);
        return new ReservaResponse(reserva.getId(), reserva.getAluno().getId(), reserva.getDataUtilizacao(),
                reserva.getDataHoraReserva(), reserva.getStatusReserva(),
                reserva.getPontoEmbarque().getId(), reserva.getPontoEmbarque().getNome(), reserva.getDataHoraCancelamento());
    }
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ReservaResponse alterarPontoEmbarque(@NotNull UUID alunoId, @NotNull UUID reservaId,
                                               @Valid @NotNull AtualizacaoPontoEmbarqueReservaRequest dados) {
        // Consultar a reserva somente depois de adquirir o mesmo lock da criação e do cancelamento.
        var aluno = usuarioRepository.findByIdParaCriarReserva(alunoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));
        if (aluno.getTipoUsuario() != TipoUsuario.ALUNO) {
            throw new RegraNegocioException("Somente alunos podem alterar o ponto de embarque de reservas.");
        }
        if (!aluno.isAtivo()) {
            throw new RegraNegocioException("O aluno está inativo.");
        }
        var reserva = reservaRepository.findById(reservaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Reserva não encontrada."));
        if (!reserva.getAluno().getId().equals(alunoId)) {
            throw new RegraNegocioException("A reserva não pertence ao aluno solicitante.");
        }
        if (reserva.getStatusReserva() != StatusReserva.CONFIRMADA) {
            throw new RegraNegocioException("Somente reservas confirmadas podem ter o ponto de embarque alterado.");
        }
        if (reserva.getDataHoraReserva().isAfter(LocalDateTime.now(clock))) {
            throw new RegraNegocioException("A reserva não pode ser alterada antes de sua criação.");
        }
        if (!regrasTemporais.permiteAlterarPontoEmbarque(reserva.getDataUtilizacao())) {
            throw new RegraNegocioException("O horário está fora do prazo de alteração do ponto de embarque.");
        }
        var ponto = pontoEmbarqueRepository.findById(dados.pontoEmbarqueId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Ponto de embarque não encontrado."));
        if (!ponto.isAtivo()) {
            throw new RegraNegocioException("O ponto de embarque está inativo.");
        }
        reserva.setPontoEmbarque(ponto);
        return new ReservaResponse(reserva.getId(), reserva.getAluno().getId(), reserva.getDataUtilizacao(),
                reserva.getDataHoraReserva(), reserva.getStatusReserva(),
                ponto.getId(), ponto.getNome(), reserva.getDataHoraCancelamento());
    }
    @Transactional(readOnly = true)
    public PainelReservasAlunoResponse consultarPainel(@NotNull UUID alunoId) {
        var aluno = usuarioRepository.findById(alunoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));
        if (aluno.getTipoUsuario() != TipoUsuario.ALUNO) {
            throw new RegraNegocioException("Somente alunos podem consultar o painel de reservas.");
        }
        if (!aluno.isAtivo()) {
            throw new RegraNegocioException("O aluno está inativo.");
        }
        LocalDate hoje = LocalDate.now(clock);
        LocalDate proximaData = regrasTemporais.proximoDiaTransporte(hoje);
        var atual = regrasTemporais.ehDiaTransporte(hoje) ? buscarConfirmadaParaPainel(alunoId, hoje) : null;
        var proxima = buscarConfirmadaParaPainel(alunoId, proximaData);
        ReservaResponse comprovante = atual == null ? null : new ReservaResponse(atual.getId(), atual.getAluno().getId(),
                atual.getDataUtilizacao(), atual.getDataHoraReserva(), atual.getStatusReserva(),
                atual.getPontoEmbarque().getId(), atual.getPontoEmbarque().getNome(), atual.getDataHoraCancelamento());
        return new PainelReservasAlunoResponse(comprovante, proxima == null ? null
                : new ConfirmacaoProximaReservaResponse(proxima.getDataUtilizacao(), proxima.getStatusReserva()));
    }

    /** Página começa em zero; tamanho nulo utiliza o padrão de dez registros. */
    @Transactional(readOnly = true)
    public Page<ReservaResponse> consultarHistorico(@NotNull UUID alunoId, int pagina, Integer tamanho) {
        int tamanhoEfetivo = tamanho == null ? 10 : tamanho;
        if (pagina < 0) {
            throw new RegraNegocioException("A página não pode ser negativa.");
        }
        if (tamanhoEfetivo < 1 || tamanhoEfetivo > 50) {
            throw new RegraNegocioException("O tamanho da página deve estar entre 1 e 50.");
        }
        var aluno = usuarioRepository.findById(alunoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));
        if (aluno.getTipoUsuario() != TipoUsuario.ALUNO) {
            throw new RegraNegocioException("Somente alunos podem consultar o histórico de reservas.");
        }
        if (!aluno.isAtivo()) {
            throw new RegraNegocioException("O aluno está inativo.");
        }
        var ordenacao = Sort.by(Sort.Order.desc("dataUtilizacao"), Sort.Order.desc("dataHoraReserva"), Sort.Order.asc("id"));
        return reservaRepository.findByAlunoId(alunoId, PageRequest.of(pagina, tamanhoEfetivo, ordenacao))
                .map(reserva -> new ReservaResponse(reserva.getId(), reserva.getAluno().getId(), reserva.getDataUtilizacao(),
                        reserva.getDataHoraReserva(), reserva.getStatusReserva(), reserva.getPontoEmbarque().getId(),
                        reserva.getPontoEmbarque().getNome(), reserva.getDataHoraCancelamento()));
    }

    private Reserva buscarConfirmadaParaPainel(UUID alunoId, LocalDate data) {
        try {
            return reservaRepository.findByAlunoIdAndDataUtilizacaoAndStatusReserva(alunoId, data, StatusReserva.CONFIRMADA)
                    .orElse(null);
        } catch (IncorrectResultSizeDataAccessException e) {
            log.error("Reservas confirmadas duplicadas para aluno {} e data {}", alunoId, data, e);
            throw new RegraNegocioException("Inconsistência: mais de uma reserva confirmada para o aluno e a data.");
        }
    }
}
