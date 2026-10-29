package com.maragogi.maragobus.service;

import com.maragogi.maragobus.dto.solicitacaoadvertencia.*;
import com.maragogi.maragobus.entity.SolicitacaoAdvertencia;
import com.maragogi.maragobus.enums.StatusSolicitacaoAdvertencia;
import com.maragogi.maragobus.enums.TipoUsuario;
import com.maragogi.maragobus.exception.RecursoNaoEncontradoException;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.SolicitacaoAdvertenciaRepository;
import com.maragogi.maragobus.repository.UsuarioRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.UUID;

@Service
@Validated
public class SolicitacaoAdvertenciaService {
    private final SolicitacaoAdvertenciaRepository solicitacaoRepository;
    private final UsuarioRepository usuarioRepository;
    private final Clock clock;

    public SolicitacaoAdvertenciaService(SolicitacaoAdvertenciaRepository solicitacaoRepository,
                                         UsuarioRepository usuarioRepository, Clock clock) {
        this.solicitacaoRepository = solicitacaoRepository;
        this.usuarioRepository = usuarioRepository;
        this.clock = clock.withZone(ZoneId.of("America/Maceio"));
    }

    // O motoristaId é interno; autenticação e autorização HTTP continuam pendentes.
    @Transactional
    public SolicitacaoAdvertenciaResponse solicitar(@NotNull UUID motoristaId,
                                                    @Valid @NotNull CriacaoSolicitacaoAdvertenciaRequest dados) {
        String descricao = dados.descricao();
        if (descricao == null || descricao.isBlank() || descricao.length() > 1000) {
            throw new RegraNegocioException("A descrição é obrigatória e deve ter no máximo 1000 caracteres.");
        }
        var motorista = usuarioRepository.findById(motoristaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Motorista não encontrado."));
        if (motorista.getTipoUsuario() != TipoUsuario.MOTORISTA) {
            throw new RegraNegocioException("Somente motoristas podem solicitar advertências.");
        }
        if (!motorista.isAtivo()) {
            throw new RegraNegocioException("O motorista está inativo.");
        }
        var aluno = usuarioRepository.findById(dados.alunoId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Aluno não encontrado."));
        if (aluno.getTipoUsuario() != TipoUsuario.ALUNO) {
            throw new RegraNegocioException("A solicitação deve ser destinada a um aluno.");
        }
        if (!aluno.isAtivo()) {
            throw new RegraNegocioException("O aluno está inativo.");
        }
        var solicitacao = SolicitacaoAdvertencia.builder().aluno(aluno).motoristaSolicitante(motorista)
                .descricao(descricao.strip()).dataHoraSolicitacao(LocalDateTime.now(clock))
                .status(StatusSolicitacaoAdvertencia.PENDENTE).build();
        var salva = solicitacaoRepository.save(solicitacao);
        return new SolicitacaoAdvertenciaResponse(salva.getId(), salva.getMotoristaSolicitante().getId(),
                salva.getAluno().getId(), salva.getDescricao(), salva.getStatus(), salva.getDataHoraSolicitacao());
    }
}
