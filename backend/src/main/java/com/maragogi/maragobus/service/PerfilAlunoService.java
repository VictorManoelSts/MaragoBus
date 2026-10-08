package com.maragogi.maragobus.service;

import com.maragogi.maragobus.dto.perfilaluno.AtualizacaoPerfilAlunoRequest;
import com.maragogi.maragobus.dto.perfilaluno.PerfilAlunoResponse;
import com.maragogi.maragobus.entity.PerfilAluno;
import com.maragogi.maragobus.exception.RecursoNaoEncontradoException;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.CursoOfertadoRepository;
import com.maragogi.maragobus.repository.PerfilAlunoRepository;
import com.maragogi.maragobus.repository.PontoEmbarqueRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

import java.util.UUID;

@Service
@Validated
public class PerfilAlunoService {
    private final PerfilAlunoRepository perfilAlunoRepository;
    private final CursoOfertadoRepository cursoOfertadoRepository;
    private final PontoEmbarqueRepository pontoEmbarqueRepository;

    public PerfilAlunoService(PerfilAlunoRepository perfilAlunoRepository,
                              CursoOfertadoRepository cursoOfertadoRepository,
                              PontoEmbarqueRepository pontoEmbarqueRepository) {
        this.perfilAlunoRepository = perfilAlunoRepository;
        this.cursoOfertadoRepository = cursoOfertadoRepository;
        this.pontoEmbarqueRepository = pontoEmbarqueRepository;
    }

    // O UUID identifica o perfil; a autorização será aplicada na futura camada de segurança.
    @Transactional(readOnly = true)
    public PerfilAlunoResponse buscarPorUsuarioId(@NotNull UUID usuarioId) {
        return converterParaResponse(buscarPerfil(usuarioId));
    }

    @Transactional
    public PerfilAlunoResponse atualizarDados(@NotNull UUID usuarioId,
                                              @Valid @NotNull AtualizacaoPerfilAlunoRequest dados) {
        PerfilAluno perfil = buscarPerfil(usuarioId);
        if (dados == null || dados.cursoOfertadoId() == null || dados.pontoEmbarquePadraoId() == null) {
            throw new RegraNegocioException("O curso ofertado e o ponto de embarque são obrigatórios.");
        }
        if (dados.semestreAtual() == null || dados.semestreAtual() <= 0) {
            throw new RegraNegocioException("O semestre atual deve ser um número positivo.");
        }

        var cursoOfertado = perfil.getCursoOfertado();
        if (!cursoOfertado.getId().equals(dados.cursoOfertadoId())) {
            cursoOfertado = cursoOfertadoRepository.findById(dados.cursoOfertadoId())
                    .orElseThrow(() -> new RecursoNaoEncontradoException("Curso ofertado não encontrado."));
            if (!cursoOfertado.isAtivo()) {
                throw new RegraNegocioException("O curso ofertado está inativo.");
            }
            if (!cursoOfertado.getCurso().isAtivo()) {
                throw new RegraNegocioException("O curso está inativo.");
            }
            if (!cursoOfertado.getFaculdade().isAtivo()) {
                throw new RegraNegocioException("A faculdade está inativa.");
            }
        }

        var pontoEmbarque = perfil.getPontoEmbarquePadrao();
        if (!pontoEmbarque.getId().equals(dados.pontoEmbarquePadraoId())) {
            pontoEmbarque = pontoEmbarqueRepository.findById(dados.pontoEmbarquePadraoId())
                    .orElseThrow(() -> new RecursoNaoEncontradoException("Ponto de embarque não encontrado."));
            if (!pontoEmbarque.isAtivo()) {
                throw new RegraNegocioException("O ponto de embarque está inativo.");
            }
        }

        // Todas as validações precedem a mutação da entidade gerenciada.
        perfil.setCursoOfertado(cursoOfertado);
        perfil.setSemestreAtual(dados.semestreAtual());
        perfil.setPontoEmbarquePadrao(pontoEmbarque);
        return converterParaResponse(perfil);
    }

    private PerfilAluno buscarPerfil(UUID usuarioId) {
        return perfilAlunoRepository.findByUsuarioId(usuarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Perfil de aluno não encontrado."));
    }

    private PerfilAlunoResponse converterParaResponse(PerfilAluno perfil) {
        var oferta = perfil.getCursoOfertado();
        var curso = oferta.getCurso();
        var faculdade = oferta.getFaculdade();
        var ponto = perfil.getPontoEmbarquePadrao();
        return new PerfilAlunoResponse(perfil.getUsuario().getId(), perfil.getId(), oferta.getId(),
                curso.getId(), curso.getNome(), faculdade.getId(), faculdade.getNome(),
                oferta.getModalidadeEnsino(), perfil.getSemestreAtual(),
                ponto.getId(), ponto.getNome(), ponto.getDescricao());
    }
}
