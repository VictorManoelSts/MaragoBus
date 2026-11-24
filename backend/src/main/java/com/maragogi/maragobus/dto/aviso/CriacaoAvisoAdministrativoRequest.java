package com.maragogi.maragobus.dto.aviso;

import com.maragogi.maragobus.enums.EscopoAviso;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CriacaoAvisoAdministrativoRequest(
        @NotBlank(message = "O título do aviso é obrigatório.")
        @Size(max = 150, message = "O título do aviso deve ter no máximo 150 caracteres.")
        String titulo,
        @NotBlank(message = "O conteúdo do aviso é obrigatório.")
        @Size(max = 2000, message = "O conteúdo do aviso deve ter no máximo 2000 caracteres.")
        String conteudo,
        @NotNull(message = "O escopo do aviso é obrigatório.")
        EscopoAviso escopo,
        UUID faculdadeDestinoId
) {}