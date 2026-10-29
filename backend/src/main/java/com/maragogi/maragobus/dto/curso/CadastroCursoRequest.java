package com.maragogi.maragobus.dto.curso;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CadastroCursoRequest(
        @NotBlank @Size(max = 150) String nome
) {}
