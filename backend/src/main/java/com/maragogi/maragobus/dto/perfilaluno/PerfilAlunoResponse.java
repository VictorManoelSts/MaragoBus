package com.maragogi.maragobus.dto.perfilaluno;

import com.maragogi.maragobus.enums.ModalidadeEnsino;

import java.util.UUID;

public record PerfilAlunoResponse(
        UUID usuarioId,
        UUID perfilId,
        UUID cursoOfertadoId,
        UUID cursoId,
        String cursoNome,
        UUID faculdadeId,
        String faculdadeNome,
        ModalidadeEnsino modalidadeEnsino,
        Integer semestreAtual,
        UUID pontoEmbarquePadraoId,
        String pontoEmbarquePadraoNome,
        String pontoEmbarquePadraoDescricao
) {}
