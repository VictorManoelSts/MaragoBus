package com.maragogi.maragobus.service;

import com.maragogi.maragobus.domain.suspensao.RegrasTemporaisSuspensao;
import com.maragogi.maragobus.dto.suspensao.SuspensaoResponse;
import com.maragogi.maragobus.dto.suspensao.DefinicaoDuracaoSuspensaoRequest;
import com.maragogi.maragobus.entity.Advertencia;
import com.maragogi.maragobus.entity.Suspensao;
import com.maragogi.maragobus.entity.Usuario;
import com.maragogi.maragobus.enums.StatusReserva;
import com.maragogi.maragobus.enums.StatusSolicitacaoAdvertencia;
import com.maragogi.maragobus.enums.StatusSuspensao;
import com.maragogi.maragobus.enums.TipoUsuario;
import com.maragogi.maragobus.exception.RecursoNaoEncontradoException;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.AdvertenciaRepository;
import com.maragogi.maragobus.repository.DataSemFuncionamentoRepository;
import com.maragogi.maragobus.repository.ReservaRepository;
import com.maragogi.maragobus.repository.SuspensaoRepository;
import com.maragogi.maragobus.repository.UsuarioRepository;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.validation.annotation.Validated;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;
import java.util.UUID;

@Service
@Validated
public class SuspensaoService {
    private final AdvertenciaRepository advertenciaRepository;
    private final SuspensaoRepository suspensaoRepository;
    private final ReservaRepository reservaRepository;
    private final UsuarioRepository usuarioRepository;
    private final DataSemFuncionamentoRepository dataSemFuncionamentoRepository;
    private final RegrasTemporaisSuspensao regrasTemporaisSuspensao;
    private final EventoReservaService eventos;
    private final Clock clock;

    public SuspensaoService(AdvertenciaRepository advertenciaRepository,
                            SuspensaoRepository suspensaoRepository,
                            ReservaRepository reservaRepository,
                            UsuarioRepository usuarioRepository,
                            DataSemFuncionamentoRepository dataSemFuncionamentoRepository,
                            RegrasTemporaisSuspensao regrasTemporaisSuspensao,
                            EventoReservaService eventos,
                            Clock clock) {
        this.advertenciaRepository = advertenciaRepository;
        this.suspensaoRepository = suspensaoRepository;
        this.reservaRepository = reservaRepository;
        this.usuarioRepository = usuarioRepository;
        this.dataSemFuncionamentoRepository = dataSemFuncionamentoRepository;
        this.regrasTemporaisSuspensao = regrasTemporaisSuspensao;
        this.eventos = eventos;
        this.clock = clock.withZone(ZoneId.of("America/Maceio"));
    }

    /**
     * Deve ser chamado dentro da mesma transação da aprovação da advertência,
     * já com o lock pessimista sobre o usuário do aluno adquirido.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public Optional<Suspensao> avaliarSuspensaoPendente(@NotNull Advertencia advertencia) {
        UUID alunoId = advertencia.getSolicitacaoAdvertencia().getAluno().getId();
        var disponiveis = advertenciaRepository
                .findBySolicitacaoAdvertenciaAlunoIdAndSolicitacaoAdvertenciaStatusAndSuspensaoIsNullOrderBySolicitacaoAdvertenciaDataHoraAnaliseAscIdAsc(
                        alunoId, StatusSolicitacaoAdvertencia.APROVADA, PageRequest.of(0, 3));

        if (!regrasTemporaisSuspensao.deveGerarSuspensao(disponiveis.size())) {
            return Optional.empty();
        }

        var suspensao = suspensaoRepository.save(Suspensao.builder()
                .advertenciaOrigem(advertencia)
                .status(StatusSuspensao.PENDENTE_DURACAO)
                .build());
        disponiveis.forEach(item -> item.setSuspensao(suspensao));
        return Optional.of(suspensao);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public SuspensaoResponse definirDuracao(@NotNull UUID administradorId, @NotNull UUID suspensaoId,
                                            @NotNull DefinicaoDuracaoSuspensaoRequest dados) {
        var administrador = validarAdministradorAtivo(administradorId);
        var duracao = regrasTemporaisSuspensao.validarDuracaoEscolhida(dados.duracaoSuspensaoDias());
        String justificativa = dados.justificativa();
        if (justificativa == null || justificativa.isBlank() || justificativa.length() > 500) {
            throw new RegraNegocioException("A justificativa é obrigatória e deve ter no máximo 500 caracteres.");
        }
        UUID alunoId = suspensaoRepository.findAlunoId(suspensaoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Suspensão não encontrada."));
        // O mesmo lock protege aprovações e reservas. Carregar o estado somente depois de obtê-lo.
        usuarioRepository.findByIdParaCriarReserva(alunoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Aluno não encontrado."));
        var suspensao = suspensaoRepository.findById(suspensaoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Suspensão não encontrada."));
        if (suspensao.getStatus() != StatusSuspensao.PENDENTE_DURACAO) {
            throw new RegraNegocioException("Somente suspensões pendentes podem receber duração.");
        }

        dataSemFuncionamentoRepository.bloquearCalendarioParaLeitura();
        LocalDateTime dataHoraAplicacao = LocalDateTime.now(clock);
        var datasBloqueadas = dataSemFuncionamentoRepository.findDatasAPartirDe(dataHoraAplicacao.toLocalDate());
        var dataInicio = regrasTemporaisSuspensao.calcularDataInicio(dataHoraAplicacao, datasBloqueadas);
        var dataFim = regrasTemporaisSuspensao.calcularDataFim(dataInicio, duracao, datasBloqueadas);
        if (suspensaoRepository.existeSobreposicao(alunoId, suspensaoId, dataInicio, dataFim)) {
            throw new RegraNegocioException("Já existe uma suspensão no período calculado.");
        }

        suspensao.setDuracao(duracao);
        suspensao.setDataInicio(dataInicio);
        suspensao.setDataFim(dataFim);
        suspensao.setAdministradorResponsavel(administrador);
        suspensao.setDataHoraAplicacao(dataHoraAplicacao);
        suspensao.setJustificativa(justificativa.strip());
        suspensao.setStatus(StatusSuspensao.APLICADA);

        var reservasAfetadas = reservaRepository.findByAlunoIdAndStatusReservaAndDataUtilizacaoBetweenOrderById(
                alunoId, StatusReserva.CONFIRMADA, dataInicio, dataFim);

        for (var reserva : reservasAfetadas) {
            reserva.setStatusReserva(StatusReserva.CANCELADA_POR_SUSPENSAO);
            reserva.setDataHoraCancelamento(dataHoraAplicacao);
            eventos.registrarCancelamentoPorSuspensao(reserva, administrador, suspensao.getJustificativa(), dataHoraAplicacao);
        }

        return toResponse(suspensao, dataHoraAplicacao.toLocalDate());
    }

    @Transactional(readOnly = true)
    public Page<SuspensaoResponse> consultarPorAluno(
            @NotNull UUID administradorId, @NotNull UUID alunoId, int pagina, Integer tamanho) {
        validarPaginacao(pagina, tamanho);
        validarAdministradorAtivo(administradorId);

        var aluno = usuarioRepository.findById(alunoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));
        if (aluno.getTipoUsuario() != TipoUsuario.ALUNO) {
            throw new RegraNegocioException("O usuário informado não é um aluno.");
        }

        int limite = tamanho == null ? 10 : tamanho;
        var ordenacao = Sort.by(Sort.Order.desc("dataHoraAplicacao").nullsFirst(), Sort.Order.asc("id"));
        LocalDate hoje = LocalDate.now(clock);

        return suspensaoRepository.findByAlunoId(alunoId, PageRequest.of(pagina, limite, ordenacao))
                .map(s -> toResponse(s, hoje));
    }

    @Transactional(readOnly = true)
    public Page<SuspensaoResponse> consultarTodas(
            @NotNull UUID administradorId, boolean apenasVigentes, int pagina, Integer tamanho) {
        validarPaginacao(pagina, tamanho);
        validarAdministradorAtivo(administradorId);

        int limite = tamanho == null ? 10 : tamanho;
        var ordenacao = Sort.by(Sort.Order.desc("dataHoraAplicacao").nullsFirst(), Sort.Order.asc("id"));
        LocalDate hoje = LocalDate.now(clock);

        return suspensaoRepository.consultarTodas(apenasVigentes, hoje, PageRequest.of(pagina, limite, ordenacao))
                .map(s -> toResponse(s, hoje));
    }

    private Usuario validarAdministradorAtivo(UUID administradorId) {
        var administrador = usuarioRepository.findById(administradorId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));
        if (administrador.getTipoUsuario() != TipoUsuario.ADMIN) {
            throw new RegraNegocioException("Somente administradores podem operar suspensões.");
        }
        if (!administrador.isAtivo()) {
            throw new RegraNegocioException("O administrador está inativo.");
        }
        return administrador;
    }

    private void validarPaginacao(int pagina, Integer tamanho) {
        int limite = tamanho == null ? 10 : tamanho;
        if (pagina < 0) {
            throw new RegraNegocioException("A página não pode ser negativa.");
        }
        if (limite < 1 || limite > 50) {
            throw new RegraNegocioException("O tamanho da página deve estar entre 1 e 50.");
        }
    }

    private SuspensaoResponse toResponse(Suspensao suspensao, LocalDate hoje) {
        var aluno = suspensao.getAdvertenciaOrigem().getSolicitacaoAdvertencia().getAluno();
        boolean vigente = suspensao.getStatus() == StatusSuspensao.APLICADA && regrasTemporaisSuspensao.cobreData(
                suspensao.getDataInicio(), suspensao.getDataFim(), hoje);

        return new SuspensaoResponse(
                suspensao.getId(),
                aluno.getId(),
                aluno.getNome(),
                suspensao.getAdvertenciaOrigem().getId(),
                suspensao.getAdministradorResponsavel() == null ? null : suspensao.getAdministradorResponsavel().getId(),
                suspensao.getDuracao(),
                suspensao.getDuracao() == null ? null : suspensao.getDuracao().getDias(),
                suspensao.getDataInicio(),
                suspensao.getDataFim(),
                suspensao.getDataHoraAplicacao(),
                vigente,
                suspensao.getStatus(),
                suspensao.getJustificativa()
        );
    }
}