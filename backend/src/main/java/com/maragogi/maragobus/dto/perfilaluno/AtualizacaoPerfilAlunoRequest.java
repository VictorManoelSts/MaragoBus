package com.maragogi.maragobus.dto.perfilaluno;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.UUID;

public record AtualizacaoPerfilAlunoRequest(
        @NotNull UUID cursoOfertadoId,
        @NotNull @Positive Integer semestreAtual,
        @NotNull UUID pontoEmbarquePadraoId
) {}
