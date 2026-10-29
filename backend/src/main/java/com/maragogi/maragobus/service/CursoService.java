package com.maragogi.maragobus.service;

import com.maragogi.maragobus.dto.curso.AtualizacaoCursoRequest;
import com.maragogi.maragobus.dto.curso.CadastroCursoRequest;
import com.maragogi.maragobus.dto.curso.CursoResponse;
import com.maragogi.maragobus.entity.Curso;
import com.maragogi.maragobus.exception.RecursoNaoEncontradoException;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.CursoRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

import java.util.List;
import java.util.UUID;

@Service
@Validated
public class CursoService {
    private final CursoRepository cursoRepository;

    public CursoService(CursoRepository cursoRepository) {
        this.cursoRepository = cursoRepository;
    }

    @Transactional
    public CursoResponse cadastrar(@Valid @NotNull CadastroCursoRequest dados) {
        String nome = dados.nome().trim();
        validarNomeDisponivel(nome);
        var curso = Curso.builder().nome(nome).ativo(true).build();
        return converterParaResponse(cursoRepository.save(curso));
    }

    @Transactional(readOnly = true)
    public CursoResponse buscarPorId(@NotNull UUID id) {
        return converterParaResponse(buscarCurso(id));
    }

    @Transactional(readOnly = true)
    public List<CursoResponse> listarTodos() {
        return cursoRepository.findAll().stream().map(this::converterParaResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<CursoResponse> listarAtivos() {
        return cursoRepository.findAllByAtivoTrue().stream().map(this::converterParaResponse).toList();
    }

    @Transactional
    public CursoResponse atualizarDados(@NotNull UUID id, @Valid @NotNull AtualizacaoCursoRequest dados) {
        Curso curso = buscarCurso(id);
        String nome = dados.nome().trim();
        if (!curso.getNome().equals(nome)) {
            validarNomeDisponivel(nome);
        }
        curso.setNome(nome);
        return converterParaResponse(curso);
    }

    @Transactional
    public void desativar(@NotNull UUID id) {
        buscarCurso(id).setAtivo(false);
    }

    @Transactional
    public void reativar(@NotNull UUID id) {
        buscarCurso(id).setAtivo(true);
    }

    private Curso buscarCurso(UUID id) {
        return cursoRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Curso não encontrado."));
    }

    private void validarNomeDisponivel(String nome) {
        if (cursoRepository.existsByNome(nome)) {
            throw new RegraNegocioException("Já existe um curso com este nome.");
        }
    }

    private CursoResponse converterParaResponse(Curso curso) {
        return new CursoResponse(curso.getId(), curso.getNome(), curso.isAtivo());
    }
}
