package com.maragogi.maragobus.dto.faculdade;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CadastroFaculdadeRequest(
        @NotBlank @Size(max = 150) String nome
) {}
