package com.maragogi.maragobus.service;

import com.maragogi.maragobus.dto.cursoofertado.CadastroCursoOfertadoRequest;
import com.maragogi.maragobus.dto.cursoofertado.CursoOfertadoResponse;
import com.maragogi.maragobus.entity.CursoOfertado;
import com.maragogi.maragobus.exception.RecursoNaoEncontradoException;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.CursoOfertadoRepository;
import com.maragogi.maragobus.repository.CursoRepository;
import com.maragogi.maragobus.repository.FaculdadeRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

import java.util.List;
import java.util.UUID;

@Service
@Validated
public class CursoOfertadoService {
    private final CursoOfertadoRepository cursoOfertadoRepository;
    private final CursoRepository cursoRepository;
    private final FaculdadeRepository faculdadeRepository;

    public CursoOfertadoService(CursoOfertadoRepository cursoOfertadoRepository,
                                CursoRepository cursoRepository, FaculdadeRepository faculdadeRepository) {
        this.cursoOfertadoRepository = cursoOfertadoRepository;
        this.cursoRepository = cursoRepository;
        this.faculdadeRepository = faculdadeRepository;
    }

    @Transactional
    public CursoOfertadoResponse cadastrar(@Valid @NotNull CadastroCursoOfertadoRequest dados) {
        var curso = cursoRepository.findById(dados.cursoId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Curso não encontrado."));
        if (!curso.isAtivo()) {
            throw new RegraNegocioException("O curso está inativo.");
        }
        var faculdade = faculdadeRepository.findById(dados.faculdadeId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Faculdade não encontrada."));
        if (!faculdade.isAtivo()) {
            throw new RegraNegocioException("A faculdade está inativa.");
        }
        if (cursoOfertadoRepository.findByCursoIdAndFaculdadeIdAndModalidadeEnsino(
                dados.cursoId(), dados.faculdadeId(), dados.modalidadeEnsino()).isPresent()) {
            throw new RegraNegocioException("Já existe uma oferta para este curso, faculdade e modalidade de ensino.");
        }
        var oferta = CursoOfertado.builder().curso(curso).faculdade(faculdade)
                .modalidadeEnsino(dados.modalidadeEnsino()).ativo(true).build();
        return converterParaResponse(cursoOfertadoRepository.save(oferta));
    }

    @Transactional(readOnly = true)
    public CursoOfertadoResponse buscarPorId(@NotNull UUID id) {
        return converterParaResponse(buscarOferta(id));
    }

    @Transactional(readOnly = true)
    public List<CursoOfertadoResponse> listarTodos() {
        return cursoOfertadoRepository.findAll().stream().map(this::converterParaResponse).toList();
    }

    /**
     * Filtra somente o estado da oferta. Para novos alunos, curso e faculdade
     * também precisam estar ativos, conforme as validações dos serviços de alunos.
     */
    @Transactional(readOnly = true)
    public List<CursoOfertadoResponse> listarAtivos() {
        return cursoOfertadoRepository.findAllByAtivoTrue().stream().map(this::converterParaResponse).toList();
    }

    @Transactional
    public void desativar(@NotNull UUID id) {
        buscarOferta(id).setAtivo(false);
    }

    @Transactional
    public void reativar(@NotNull UUID id) {
        var oferta = buscarOferta(id);
        if (!oferta.getCurso().isAtivo()) {
            throw new RegraNegocioException("O curso está inativo.");
        }
        if (!oferta.getFaculdade().isAtivo()) {
            throw new RegraNegocioException("A faculdade está inativa.");
        }
        oferta.setAtivo(true);
    }

    private CursoOfertado buscarOferta(UUID id) {
        return cursoOfertadoRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Curso ofertado não encontrado."));
    }

    private CursoOfertadoResponse converterParaResponse(CursoOfertado oferta) {
        var curso = oferta.getCurso();
        var faculdade = oferta.getFaculdade();
        return new CursoOfertadoResponse(oferta.getId(), curso.getId(), curso.getNome(),
                faculdade.getId(), faculdade.getNome(), oferta.getModalidadeEnsino(), oferta.isAtivo());
    }
}
