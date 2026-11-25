package com.maragogi.maragobus.service;

import com.maragogi.maragobus.dto.solicitacaoadvertencia.SolicitacaoAdvertenciaPendenteResponse;
import com.maragogi.maragobus.dto.solicitacaoadvertencia.RecusaSolicitacaoAdvertenciaRequest;
import com.maragogi.maragobus.dto.solicitacaoadvertencia.RecusaSolicitacaoAdvertenciaResponse;
import com.maragogi.maragobus.dto.solicitacaoadvertencia.AprovacaoSolicitacaoAdvertenciaRequest;
import com.maragogi.maragobus.dto.solicitacaoadvertencia.AprovacaoSolicitacaoAdvertenciaResponse;
import com.maragogi.maragobus.entity.Advertencia;
import com.maragogi.maragobus.entity.Suspensao;
import com.maragogi.maragobus.enums.StatusSolicitacaoAdvertencia;
import com.maragogi.maragobus.enums.TipoUsuario;
import com.maragogi.maragobus.exception.RecursoNaoEncontradoException;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.AdvertenciaRepository;
import com.maragogi.maragobus.repository.SolicitacaoAdvertenciaRepository;
import com.maragogi.maragobus.repository.UsuarioRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.UUID;

@Service
@Validated
public class AnaliseSolicitacaoAdvertenciaService {
    private final UsuarioRepository usuarioRepository;
    private final SolicitacaoAdvertenciaRepository solicitacaoRepository;
    private final AdvertenciaRepository advertenciaRepository;
    private final SuspensaoService suspensaoService;
    private final Clock clock;

    public AnaliseSolicitacaoAdvertenciaService(UsuarioRepository usuarioRepository,
                                                SolicitacaoAdvertenciaRepository solicitacaoRepository,
                                                AdvertenciaRepository advertenciaRepository,
                                                SuspensaoService suspensaoService,
                                                Clock clock) {
        this.usuarioRepository = usuarioRepository;
        this.solicitacaoRepository = solicitacaoRepository;
        this.advertenciaRepository = advertenciaRepository;
        this.suspensaoService = suspensaoService;
        this.clock = clock.withZone(ZoneId.of("America/Maceio"));
    }

    // O UUID é interno; a identidade autenticada e a autorização HTTP continuam pendentes.
    @Transactional(readOnly = true)
    public Page<SolicitacaoAdvertenciaPendenteResponse> consultarPendentes(
            @NotNull UUID administradorId, int pagina, Integer tamanho) {
        int limite = tamanho == null ? 10 : tamanho;
        if (pagina < 0) {
            throw new RegraNegocioException("A página não pode ser negativa.");
        }
        if (limite < 1 || limite > 50) {
            throw new RegraNegocioException("O tamanho da página deve estar entre 1 e 50.");
        }
        var administrador = usuarioRepository.findById(administradorId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));
        if (administrador.getTipoUsuario() != TipoUsuario.ADMIN) {
            throw new RegraNegocioException("Somente administradores podem consultar solicitações pendentes.");
        }
        if (!administrador.isAtivo()) {
            throw new RegraNegocioException("O administrador está inativo.");
        }
        return solicitacaoRepository.consultarPorStatus(StatusSolicitacaoAdvertencia.PENDENTE, PageRequest.of(pagina, limite));
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public RecusaSolicitacaoAdvertenciaResponse recusar(@NotNull UUID administradorId, @NotNull UUID solicitacaoId,
                                                        @Valid @NotNull RecusaSolicitacaoAdvertenciaRequest dados) {
        String observacao = dados.observacaoAnalise();
        if (observacao == null || observacao.isBlank() || observacao.length() > 1000) {
            throw new RegraNegocioException("A justificativa da recusa é obrigatória e deve ter no máximo 1000 caracteres.");
        }
        var administrador = usuarioRepository.findById(administradorId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));
        if (administrador.getTipoUsuario() != TipoUsuario.ADMIN) {
            throw new RegraNegocioException("Somente administradores podem recusar solicitações de advertência.");
        }
        if (!administrador.isAtivo()) {
            throw new RegraNegocioException("O administrador está inativo.");
        }
        // Não carregar a solicitação antes deste lock; uma decisão concorrente pode estar em andamento.
        var solicitacao = solicitacaoRepository.findByIdParaAnalise(solicitacaoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Solicitação de advertência não encontrada."));
        if (solicitacao.getStatus() != StatusSolicitacaoAdvertencia.PENDENTE) {
            throw new RegraNegocioException("Somente solicitações pendentes podem ser recusadas.");
        }
        var agora = LocalDateTime.now(clock);
        solicitacao.setStatus(StatusSolicitacaoAdvertencia.RECUSADA);
        solicitacao.setAdministradorResponsavel(administrador);
        solicitacao.setDataHoraAnalise(agora);
        solicitacao.setObservacaoAnalise(observacao.strip());
        return new RecusaSolicitacaoAdvertenciaResponse(solicitacao.getId(), solicitacao.getStatus(),
                administrador.getId(), agora, solicitacao.getObservacaoAnalise());
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public AprovacaoSolicitacaoAdvertenciaResponse aprovar(@NotNull UUID administradorId, @NotNull UUID solicitacaoId,
                                                           @Valid @NotNull AprovacaoSolicitacaoAdvertenciaRequest dados) {
        String observacao = dados.observacaoAnalise();
        if (observacao != null && (observacao.isBlank() || observacao.length() > 1000)) {
            throw new RegraNegocioException("A observação informada deve conter texto e ter no máximo 1000 caracteres.");
        }
        var administrador = usuarioRepository.findById(administradorId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));
        if (administrador.getTipoUsuario() != TipoUsuario.ADMIN) {
            throw new RegraNegocioException("Somente administradores podem aprovar solicitações de advertência.");
        }
        if (!administrador.isAtivo()) {
            throw new RegraNegocioException("O administrador está inativo.");
        }
        // Mesmo protocolo da recusa: o status é verificado somente após bloquear a solicitação.
        var solicitacao = solicitacaoRepository.findByIdParaAnalise(solicitacaoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Solicitação de advertência não encontrada."));
        if (solicitacao.getStatus() != StatusSolicitacaoAdvertencia.PENDENTE) {
            throw new RegraNegocioException("Somente solicitações pendentes podem ser aprovadas.");
        }

        // Serializa aprovações concorrentes e criação/cancelamento de reservas do mesmo aluno.
        usuarioRepository.findByIdParaCriarReserva(solicitacao.getAluno().getId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Aluno não encontrado."));

        var agora = LocalDateTime.now(clock);
        solicitacao.setStatus(StatusSolicitacaoAdvertencia.APROVADA);
        solicitacao.setAdministradorResponsavel(administrador);
        solicitacao.setDataHoraAnalise(agora);
        solicitacao.setObservacaoAnalise(observacao == null ? null : observacao.strip());

        var advertencia = advertenciaRepository.saveAndFlush(
                Advertencia.builder().solicitacaoAdvertencia(solicitacao).build());

        var suspensao = suspensaoService.avaliarSuspensaoPendente(advertencia);

        return new AprovacaoSolicitacaoAdvertenciaResponse(
                solicitacao.getId(),
                solicitacao.getStatus(),
                administrador.getId(),
                agora,
                solicitacao.getObservacaoAnalise(),
                advertencia.getId(),
                suspensao.map(Suspensao::getId).orElse(null)
        );
    }
}