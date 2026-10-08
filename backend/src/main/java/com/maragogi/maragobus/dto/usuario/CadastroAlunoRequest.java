package com.maragogi.maragobus.dto.usuario;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.UUID;

public record CadastroAlunoRequest(
        @NotNull @Valid CadastroUsuarioRequest dadosPessoais,
        @NotNull UUID cursoOfertadoId,
        @NotNull @Positive Integer semestreAtual,
        @NotNull UUID pontoEmbarquePadraoId
) {}
