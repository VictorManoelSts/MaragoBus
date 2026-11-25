package com.maragogi.maragobus.service;

import com.maragogi.maragobus.dto.pontoembarque.AtualizacaoPontoEmbarqueRequest;
import com.maragogi.maragobus.dto.pontoembarque.CadastroPontoEmbarqueRequest;
import com.maragogi.maragobus.dto.pontoembarque.PontoEmbarqueResponse;
import com.maragogi.maragobus.entity.PontoEmbarque;
import com.maragogi.maragobus.exception.RecursoNaoEncontradoException;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.PontoEmbarqueRepository;
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
public class PontoEmbarqueService {
    private final PontoEmbarqueRepository pontoEmbarqueRepository;

    public PontoEmbarqueService(PontoEmbarqueRepository pontoEmbarqueRepository) {
        this.pontoEmbarqueRepository = pontoEmbarqueRepository;
    }

    @Transactional
    public PontoEmbarqueResponse cadastrar(@Valid @NotNull CadastroPontoEmbarqueRequest dados) {
        String nome = dados.nome().trim();
        validarNomeDisponivel(nome);
        var ponto = PontoEmbarque.builder().nome(nome).descricao(dados.descricao()).ativo(true).build();
        return converterParaResponse(pontoEmbarqueRepository.save(ponto));
    }

    @Transactional(readOnly = true)
    public PontoEmbarqueResponse buscarPorId(@NotNull UUID id) {
        return converterParaResponse(buscarPonto(id));
    }

    @Transactional(readOnly = true)
    public List<PontoEmbarqueResponse> listarTodos() {
        return pontoEmbarqueRepository.findAll().stream().map(this::converterParaResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<PontoEmbarqueResponse> listarAtivos() {
        return pontoEmbarqueRepository.findByAtivoTrue().stream().map(this::converterParaResponse).toList();
    }

    @Transactional(readOnly = true)
    public Page<PontoEmbarqueResponse> listar(@NotNull Pageable pagina, boolean somenteAtivos) {
        var pontos = somenteAtivos ? pontoEmbarqueRepository.findByAtivoTrue(pagina)
                : pontoEmbarqueRepository.findAll(pagina);
        return pontos.map(this::converterParaResponse);
    }

    @Transactional
    public PontoEmbarqueResponse atualizarDados(@NotNull UUID id,
                                               @Valid @NotNull AtualizacaoPontoEmbarqueRequest dados) {
        var ponto = buscarPonto(id);
        String nome = dados.nome().trim();
        if (!ponto.getNome().equals(nome)) {
            validarNomeDisponivel(nome);
        }
        ponto.setNome(nome);
        ponto.setDescricao(dados.descricao());
        return converterParaResponse(ponto);
    }

    @Transactional
    public void desativar(@NotNull UUID id) {
        buscarPonto(id).setAtivo(false);
    }

    @Transactional
    public void reativar(@NotNull UUID id) {
        buscarPonto(id).setAtivo(true);
    }

    private PontoEmbarque buscarPonto(UUID id) {
        return pontoEmbarqueRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Ponto de embarque não encontrado."));
    }

    private void validarNomeDisponivel(String nome) {
        if (pontoEmbarqueRepository.existsByNome(nome)) {
            throw new RegraNegocioException("Já existe um ponto de embarque com este nome.");
        }
    }

    private PontoEmbarqueResponse converterParaResponse(PontoEmbarque ponto) {
        return new PontoEmbarqueResponse(ponto.getId(), ponto.getNome(), ponto.getDescricao(), ponto.isAtivo());
    }
}
