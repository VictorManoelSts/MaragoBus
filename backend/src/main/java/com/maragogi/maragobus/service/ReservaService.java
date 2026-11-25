package com.maragogi.maragobus.service;

import com.maragogi.maragobus.domain.reserva.RegrasTemporaisReserva;
import com.maragogi.maragobus.dto.reserva.CriacaoReservaRequest;
import com.maragogi.maragobus.dto.reserva.AtualizacaoPontoEmbarqueReservaRequest;
import com.maragogi.maragobus.dto.reserva.ReservaResponse;
import com.maragogi.maragobus.dto.reserva.PainelReservasAlunoResponse;
import com.maragogi.maragobus.dto.reserva.ConfirmacaoProximaReservaResponse;
import com.maragogi.maragobus.entity.PerfilAluno;
import com.maragogi.maragobus.entity.PontoEmbarque;
import com.maragogi.maragobus.entity.Reserva;
import com.maragogi.maragobus.entity.Usuario;
import com.maragogi.maragobus.enums.StatusReserva;
import com.maragogi.maragobus.enums.TipoUsuario;
import com.maragogi.maragobus.exception.RecursoNaoEncontradoException;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.DataSemFuncionamentoRepository;
import com.maragogi.maragobus.repository.PerfilAlunoRepository;
import com.maragogi.maragobus.repository.PontoEmbarqueRepository;
import com.maragogi.maragobus.repository.ReservaRepository;
import com.maragogi.maragobus.repository.SuspensaoRepository;
import com.maragogi.maragobus.repository.UsuarioRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.IncorrectResultSizeDataAccessException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Set;
import java.util.UUID;

@Service
@Validated
public class ReservaService {
    private static final org.slf4j.Logger log = LoggerFactory.getLogger(ReservaService.class);
    private final UsuarioRepository usuarioRepository;
    private final PerfilAlunoRepository perfilAlunoRepository;
    private final ReservaRepository reservaRepository;
    private final PontoEmbarqueRepository pontoEmbarqueRepository;
    private final SuspensaoRepository suspensaoRepository;
    private final DataSemFuncionamentoRepository dataSemFuncionamentoRepository;
    private final RegrasTemporaisReserva regrasTemporais;
    private final Clock clock;
    private final EventoReservaService eventoReservaService;

    public ReservaService(UsuarioRepository usuarioRepository, PerfilAlunoRepository perfilAlunoRepository,
                          ReservaRepository reservaRepository, PontoEmbarqueRepository pontoEmbarqueRepository,
                          SuspensaoRepository suspensaoRepository,
                          DataSemFuncionamentoRepository dataSemFuncionamentoRepository,
                          RegrasTemporaisReserva regrasTemporais, Clock clock) {
        this(usuarioRepository, perfilAlunoRepository, reservaRepository, pontoEmbarqueRepository,
                suspensaoRepository, dataSemFuncionamentoRepository, regrasTemporais, clock, null);
    }

    @Autowired
    public ReservaService(UsuarioRepository usuarioRepository, PerfilAlunoRepository perfilAlunoRepository,
                          ReservaRepository reservaRepository, PontoEmbarqueRepository pontoEmbarqueRepository,
                          SuspensaoRepository suspensaoRepository,
                          DataSemFuncionamentoRepository dataSemFuncionamentoRepository,
                          RegrasTemporaisReserva regrasTemporais, Clock clock,
                          EventoReservaService eventoReservaService) {
        this.usuarioRepository = usuarioRepository;
        this.perfilAlunoRepository = perfilAlunoRepository;
        this.reservaRepository = reservaRepository;
        this.pontoEmbarqueRepository = pontoEmbarqueRepository;
        this.suspensaoRepository = suspensaoRepository;
        this.dataSemFuncionamentoRepository = dataSemFuncionamentoRepository;
        this.regrasTemporais = regrasTemporais;
        this.clock = clock.withZone(ZoneId.of("America/Maceio"));
        this.eventoReservaService = eventoReservaService;
    }

    // O UUID é um argumento interno, não uma autorização. Autenticação continua pendente.
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ReservaResponse cadastrar(@NotNull UUID alunoId, @Valid @NotNull CriacaoReservaRequest dados) {
        var aluno = validarAlunoComLock(alunoId, "Somente alunos podem criar reservas.");
        var perfil = perfilAlunoRepository.findByUsuarioId(alunoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Perfil de aluno não encontrado."));
        var ponto = validarPontoPadrao(perfil);

        Set<LocalDate> datasBloqueadas = dataSemFuncionamentoRepository.findDatasNoPeriodo(
                dados.dataUtilizacao().minusDays(30), dados.dataUtilizacao());
        if (datasBloqueadas.contains(dados.dataUtilizacao())) {
            throw new RegraNegocioException("Não há funcionamento do transporte na data informada.");
        }
        if (!regrasTemporais.permiteReservar(dados.dataUtilizacao(), datasBloqueadas)) {
            throw new RegraNegocioException("A data de utilização ou o horário está fora da janela de reservas.");
        }
        if (suspensaoRepository.existsSuspensaoVigenteParaData(alunoId, dados.dataUtilizacao())) {
            throw new RegraNegocioException("O aluno está suspenso para a data de utilização informada.");
        }
        if (reservaRepository.existsByAlunoIdAndDataUtilizacaoAndStatusReserva(
                alunoId, dados.dataUtilizacao(), StatusReserva.CONFIRMADA)) {
            throw new RegraNegocioException("Já existe uma reserva confirmada para este aluno e data.");
        }

        var salva = reservaRepository.save(construirReservaComSnapshot(aluno, perfil, ponto, dados.dataUtilizacao()));
        if (eventoReservaService != null) {
            eventoReservaService.registrarCriacao(salva, aluno, salva.getDataHoraReserva());
        }
        return mapearResposta(salva);
    }

    /**
     * Calcula a data de utilização no servidor conforme a janela aberta atual e garante idempotência:
     * se já existir reserva confirmada para o aluno na data calculada, retorna a reserva existente.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ReservaResponse reservarProximaDataDisponivel(@NotNull UUID alunoId) {
        var aluno = validarAlunoComLock(alunoId, "Somente alunos podem criar reservas.");
        var perfil = perfilAlunoRepository.findByUsuarioId(alunoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Perfil de aluno não encontrado."));
        var ponto = validarPontoPadrao(perfil);

        LocalDate hoje = LocalDate.now(clock);
        Set<LocalDate> datasBloqueadas = dataSemFuncionamentoRepository.findDatasAPartirDe(hoje);
        LocalDate dataAlvo = calcularDataAbertaNoServidor(hoje, datasBloqueadas);

        if (suspensaoRepository.existsSuspensaoVigenteParaData(alunoId, dataAlvo)) {
            throw new RegraNegocioException("O aluno está suspenso para a data de utilização informada.");
        }

        var existente = reservaRepository.findByAlunoIdAndDataUtilizacaoAndStatusReserva(
                alunoId, dataAlvo, StatusReserva.CONFIRMADA);
        if (existente.isPresent()) {
            return mapearResposta(existente.get());
        }

        var salva = reservaRepository.saveAndFlush(construirReservaComSnapshot(aluno, perfil, ponto, dataAlvo));
        if (eventoReservaService != null) {
            eventoReservaService.registrarCriacao(salva, aluno, salva.getDataHoraReserva());
        }
        return mapearResposta(salva);
    }

    // A identidade autenticada deverá fornecer alunoId futuramente.
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ReservaResponse cancelar(@NotNull UUID alunoId, @NotNull UUID reservaId) {
        return executarCancelamento(alunoId, reservaId, null);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ReservaResponse cancelar(@NotNull UUID alunoId, @NotNull UUID reservaId, String motivo) {
        return executarCancelamento(alunoId, reservaId, motivo);
    }

    private ReservaResponse executarCancelamento(UUID alunoId, UUID reservaId, String motivo) {
        // Mesma ordem da criação: lock do aluno antes de consultar ou alterar reservas.
        var aluno = validarAlunoComLock(alunoId, "Somente alunos podem cancelar reservas.");
        var reserva = reservaRepository.findLockedById(reservaId)
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
        if (eventoReservaService != null) {
            eventoReservaService.registrarCancelamentoPeloAluno(reserva, aluno, motivo, agora);
        }
        return mapearResposta(reserva);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ReservaResponse alterarPontoEmbarque(@NotNull UUID alunoId, @NotNull UUID reservaId,
                                                @Valid @NotNull AtualizacaoPontoEmbarqueReservaRequest dados) {
        // Consultar a reserva somente depois de adquirir o mesmo lock da criação e do cancelamento.
        var aluno = validarAlunoComLock(alunoId, "Somente alunos podem alterar o ponto de embarque de reservas.");
        var reserva = reservaRepository.findLockedById(reservaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Reserva não encontrada."));
        if (!reserva.getAluno().getId().equals(alunoId)) {
            throw new RegraNegocioException("A reserva não pertence ao aluno solicitante.");
        }
        if (reserva.getStatusReserva() != StatusReserva.CONFIRMADA) {
            throw new RegraNegocioException("Somente reservas confirmadas podem ter o ponto de embarque alterado.");
        }
        LocalDateTime agora = LocalDateTime.now(clock);
        if (reserva.getDataHoraReserva().isAfter(agora)) {
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
        String pontoAnteriorNome = reserva.getPontoEmbarqueNomeSnapshot() != null
                ? reserva.getPontoEmbarqueNomeSnapshot()
                : reserva.getPontoEmbarque().getNome();
        reserva.setPontoEmbarque(ponto);
        reserva.setPontoEmbarqueNomeSnapshot(ponto.getNome());
        if (eventoReservaService != null) {
            eventoReservaService.registrarAlteracaoPontoEmbarque(reserva, aluno, pontoAnteriorNome, ponto.getNome(), agora);
        }
        return mapearResposta(reserva);
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
        Set<LocalDate> datasBloqueadas = dataSemFuncionamentoRepository.findDatasAPartirDe(hoje);
        LocalDate proximaData = regrasTemporais.proximoDiaTransporte(hoje, datasBloqueadas);
        var atual = regrasTemporais.ehDiaTransporte(hoje, datasBloqueadas) ? buscarConfirmadaParaPainel(alunoId, hoje) : null;
        var proxima = buscarConfirmadaParaPainel(alunoId, proximaData);
        ReservaResponse comprovante = atual == null ? null : mapearResposta(atual);
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
                .map(this::mapearResposta);
    }

    private Usuario validarAlunoComLock(UUID alunoId, String mensagemTipo) {
        var aluno = usuarioRepository.findByIdParaCriarReserva(alunoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));
        if (aluno.getTipoUsuario() != TipoUsuario.ALUNO) {
            throw new RegraNegocioException(mensagemTipo);
        }
        if (!aluno.isAtivo()) {
            throw new RegraNegocioException("O aluno está inativo.");
        }
        return aluno;
    }

    private PontoEmbarque validarPontoPadrao(PerfilAluno perfil) {
        var ponto = perfil.getPontoEmbarquePadrao();
        if (ponto == null) {
            throw new RegraNegocioException("O aluno não possui ponto de embarque padrão.");
        }
        if (!ponto.isAtivo()) {
            throw new RegraNegocioException("O ponto de embarque está inativo.");
        }
        return ponto;
    }

    private LocalDate calcularDataAbertaNoServidor(LocalDate hoje, Set<LocalDate> datasBloqueadas) {
        if (!datasBloqueadas.contains(hoje) && regrasTemporais.permiteReservar(hoje, datasBloqueadas)) {
            return hoje;
        }
        LocalDate proximaData = regrasTemporais.proximoDiaTransporte(hoje, datasBloqueadas);
        if (!datasBloqueadas.contains(proximaData) && regrasTemporais.permiteReservar(proximaData, datasBloqueadas)) {
            return proximaData;
        }
        throw new RegraNegocioException("Nenhuma janela de reservas está aberta no momento.");
    }

    private Reserva construirReservaComSnapshot(Usuario aluno, PerfilAluno perfil, PontoEmbarque ponto, LocalDate data) {
        var oferta = perfil.getCursoOfertado();
        var faculdade = oferta == null ? null : oferta.getFaculdade();
        var curso = oferta == null ? null : oferta.getCurso();
        return Reserva.builder()
                .aluno(aluno)
                .pontoEmbarque(ponto)
                .pontoEmbarqueNomeSnapshot(ponto.getNome())
                .faculdadeIdSnapshot(faculdade == null ? null : faculdade.getId())
                .faculdadeNomeSnapshot(faculdade == null ? null : faculdade.getNome())
                .cursoNomeSnapshot(curso == null ? null : curso.getNome())
                .dataUtilizacao(data)
                .dataHoraReserva(LocalDateTime.now(clock))
                .statusReserva(StatusReserva.CONFIRMADA)
                .dataHoraCancelamento(null)
                .build();
    }

    private ReservaResponse mapearResposta(Reserva reserva) {
        String nomePonto = reserva.getPontoEmbarqueNomeSnapshot() != null
                ? reserva.getPontoEmbarqueNomeSnapshot()
                : reserva.getPontoEmbarque().getNome();
        return new ReservaResponse(
                reserva.getId(),
                reserva.getAluno().getId(),
                reserva.getDataUtilizacao(),
                reserva.getDataHoraReserva(),
                reserva.getStatusReserva(),
                reserva.getPontoEmbarque().getId(),
                nomePonto,
                reserva.getDataHoraCancelamento()
        );
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