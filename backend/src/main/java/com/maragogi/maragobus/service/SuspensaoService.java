package com.maragogi.maragobus.service;

import com.maragogi.maragobus.domain.suspensao.RegrasTemporaisSuspensao;
import com.maragogi.maragobus.dto.suspensao.SuspensaoResponse;
import com.maragogi.maragobus.entity.Advertencia;
import com.maragogi.maragobus.entity.Suspensao;
import com.maragogi.maragobus.entity.Usuario;
import com.maragogi.maragobus.enums.DuracaoSuspensao;
import com.maragogi.maragobus.enums.StatusReserva;
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
import org.springframework.validation.annotation.Validated;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;
import java.util.Set;
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
    private final Clock clock;

    public SuspensaoService(AdvertenciaRepository advertenciaRepository,
                            SuspensaoRepository suspensaoRepository,
                            ReservaRepository reservaRepository,
                            UsuarioRepository usuarioRepository,
                            DataSemFuncionamentoRepository dataSemFuncionamentoRepository,
                            RegrasTemporaisSuspensao regrasTemporaisSuspensao,
                            Clock clock) {
        this.advertenciaRepository = advertenciaRepository;
        this.suspensaoRepository = suspensaoRepository;
        this.reservaRepository = reservaRepository;
        this.usuarioRepository = usuarioRepository;
        this.dataSemFuncionamentoRepository = dataSemFuncionamentoRepository;
        this.regrasTemporaisSuspensao = regrasTemporaisSuspensao;
        this.clock = clock.withZone(ZoneId.of("America/Maceio"));
    }

    /**
     * Deve ser chamado dentro da mesma transação da aprovação da advertência,
     * já com o lock pessimista sobre o usuário do aluno adquirido.
     */
    @Transactional
    public Optional<Suspensao> avaliarEAplicarPorAdvertencia(
            @NotNull Advertencia advertencia,
            @NotNull Usuario administradorResponsavel,
            @NotNull LocalDateTime dataHoraAplicacao) {

        UUID alunoId = advertencia.getSolicitacaoAdvertencia().getAluno().getId();
        long totalAdvertencias = advertenciaRepository.countBySolicitacaoAdvertenciaAlunoId(alunoId);

        if (!regrasTemporaisSuspensao.deveGerarSuspensao(totalAdvertencias)) {
            return Optional.empty();
        }

        Set<LocalDate> datasBloqueadas = dataSemFuncionamentoRepository.findDatasAPartirDe(
                dataHoraAplicacao.toLocalDate());
        DuracaoSuspensao duracao = regrasTemporaisSuspensao.calcularDuracao(totalAdvertencias);
        LocalDate dataInicio = regrasTemporaisSuspensao.calcularDataInicio(dataHoraAplicacao, datasBloqueadas);
        LocalDate dataFim = regrasTemporaisSuspensao.calcularDataFim(dataInicio, duracao, datasBloqueadas);

        Suspensao suspensao = Suspensao.builder()
                .advertenciaOrigem(advertencia)
                .duracao(duracao)
                .dataInicio(dataInicio)
                .dataFim(dataFim)
                .administradorResponsavel(administradorResponsavel)
                .dataHoraAplicacao(dataHoraAplicacao)
                .build();

        Suspensao salva = suspensaoRepository.save(suspensao);

        var reservasAfetadas = reservaRepository.findByAlunoIdAndStatusReservaAndDataUtilizacaoBetween(
                alunoId, StatusReserva.CONFIRMADA, dataInicio, dataFim);

        for (var reserva : reservasAfetadas) {
            reserva.setStatusReserva(StatusReserva.CANCELADA_POR_SUSPENSAO);
            reserva.setDataHoraCancelamento(dataHoraAplicacao);
        }

        return Optional.of(salva);
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
        var ordenacao = Sort.by(Sort.Order.desc("dataHoraAplicacao"), Sort.Order.asc("id"));
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
        var ordenacao = Sort.by(Sort.Order.desc("dataHoraAplicacao"), Sort.Order.asc("id"));
        LocalDate hoje = LocalDate.now(clock);

        return suspensaoRepository.consultarTodas(apenasVigentes, hoje, PageRequest.of(pagina, limite, ordenacao))
                .map(s -> toResponse(s, hoje));
    }

    private void validarAdministradorAtivo(UUID administradorId) {
        var administrador = usuarioRepository.findById(administradorId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));
        if (administrador.getTipoUsuario() != TipoUsuario.ADMIN) {
            throw new RegraNegocioException("Somente administradores podem consultar suspensões.");
        }
        if (!administrador.isAtivo()) {
            throw new RegraNegocioException("O administrador está inativo.");
        }
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
        boolean vigente = regrasTemporaisSuspensao.cobreData(
                suspensao.getDataInicio(), suspensao.getDataFim(), hoje);

        return new SuspensaoResponse(
                suspensao.getId(),
                aluno.getId(),
                aluno.getNome(),
                suspensao.getAdvertenciaOrigem().getId(),
                suspensao.getAdministradorResponsavel().getId(),
                suspensao.getDuracao(),
                suspensao.getDuracao().getDias(),
                suspensao.getDataInicio(),
                suspensao.getDataFim(),
                suspensao.getDataHoraAplicacao(),
                vigente
        );
    }
}