package com.maragogi.maragobus.dto.datasemfuncionamento;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CadastroDataSemFuncionamentoRequest(
        @NotNull(message = "A data sem funcionamento é obrigatória.")
        LocalDate data,
        @NotBlank(message = "O motivo é obrigatório.")
        @Size(max = 500, message = "O motivo deve ter no máximo 500 caracteres.")
        String motivo
) {}