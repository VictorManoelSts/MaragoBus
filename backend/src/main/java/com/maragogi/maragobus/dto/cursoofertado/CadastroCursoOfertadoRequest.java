package com.maragogi.maragobus.dto.cursoofertado;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.maragogi.maragobus.enums.ModalidadeEnsino;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CadastroCursoOfertadoRequest(
        @NotNull UUID cursoId,
        @NotNull UUID faculdadeId,
        @NotNull ModalidadeEnsino modalidadeEnsino
) {
    @JsonCreator
    public static CadastroCursoOfertadoRequest doJson(
            @JsonProperty("cursoId") UUID cursoId,
            @JsonProperty("faculdadeId") UUID faculdadeId,
            @JsonProperty("modalidadeEnsino") String modalidadeEnsino) {
        return new CadastroCursoOfertadoRequest(cursoId, faculdadeId,
                modalidadeEnsino == null ? null : ModalidadeEnsino.valueOf(modalidadeEnsino));
    }
}
