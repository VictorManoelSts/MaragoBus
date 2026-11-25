package com.maragogi.maragobus.service;

import com.maragogi.maragobus.dto.faculdade.AtualizacaoFaculdadeRequest;
import com.maragogi.maragobus.dto.faculdade.CadastroFaculdadeRequest;
import com.maragogi.maragobus.dto.faculdade.FaculdadeResponse;
import com.maragogi.maragobus.entity.Faculdade;
import com.maragogi.maragobus.exception.RecursoNaoEncontradoException;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.FaculdadeRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

import java.util.List;
import java.util.UUID;

@Service
@Validated
public class FaculdadeService {
    private final FaculdadeRepository faculdadeRepository;

    public FaculdadeService(FaculdadeRepository faculdadeRepository) {
        this.faculdadeRepository = faculdadeRepository;
    }

    @Transactional
    public FaculdadeResponse cadastrar(@Valid @NotNull CadastroFaculdadeRequest dados) {
        String nome = dados.nome().trim();
        validarNomeDisponivel(nome);
        var faculdade = Faculdade.builder().nome(nome).ativo(true).build();
        return converterParaResponse(faculdadeRepository.save(faculdade));
    }

    @Transactional(readOnly = true)
    public FaculdadeResponse buscarPorId(@NotNull UUID id) {
        return converterParaResponse(buscarFaculdade(id));
    }

    @Transactional(readOnly = true)
    public List<FaculdadeResponse> listarTodos() {
        return faculdadeRepository.findAll().stream().map(this::converterParaResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<FaculdadeResponse> listarAtivos() {
        return faculdadeRepository.findByAtivoTrue().stream().map(this::converterParaResponse).toList();
    }

    @Transactional(readOnly = true)
    public Page<FaculdadeResponse> listar(@NotNull Pageable pagina, boolean somenteAtivos) {
        var faculdades = somenteAtivos
                ? faculdadeRepository.findByAtivoTrue(pagina)
                : faculdadeRepository.findAll(pagina);
        return faculdades.map(this::converterParaResponse);
    }

    @Transactional
    public FaculdadeResponse atualizarDados(@NotNull UUID id, @Valid @NotNull AtualizacaoFaculdadeRequest dados) {
        Faculdade faculdade = buscarFaculdade(id);
        String nome = dados.nome().trim();
        if (!faculdade.getNome().equals(nome)) {
            validarNomeDisponivel(nome);
        }
        faculdade.setNome(nome);
        return converterParaResponse(faculdade);
    }

    @Transactional
    public void desativar(@NotNull UUID id) {
        buscarFaculdade(id).setAtivo(false);
    }

    @Transactional
    public void reativar(@NotNull UUID id) {
        buscarFaculdade(id).setAtivo(true);
    }

    private Faculdade buscarFaculdade(UUID id) {
        return faculdadeRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Faculdade não encontrada."));
    }

    private void validarNomeDisponivel(String nome) {
        if (faculdadeRepository.existsByNome(nome)) {
            throw new RegraNegocioException("Já existe uma faculdade com este nome.");
        }
    }

    private FaculdadeResponse converterParaResponse(Faculdade faculdade) {
        return new FaculdadeResponse(faculdade.getId(), faculdade.getNome(), faculdade.isAtivo());
    }
}
