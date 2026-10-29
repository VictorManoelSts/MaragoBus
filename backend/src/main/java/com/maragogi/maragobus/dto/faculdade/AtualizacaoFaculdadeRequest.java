package com.maragogi.maragobus.dto.faculdade;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AtualizacaoFaculdadeRequest(
        @NotBlank @Size(max = 150) String nome
) {}
