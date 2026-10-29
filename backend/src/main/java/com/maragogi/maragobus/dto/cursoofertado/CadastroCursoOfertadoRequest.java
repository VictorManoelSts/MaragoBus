package com.maragogi.maragobus.dto.cursoofertado;

import com.maragogi.maragobus.enums.ModalidadeEnsino;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CadastroCursoOfertadoRequest(
        @NotNull UUID cursoId,
        @NotNull UUID faculdadeId,
        @NotNull ModalidadeEnsino modalidadeEnsino
) {}
