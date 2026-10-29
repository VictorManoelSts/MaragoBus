package com.maragogi.maragobus.dto.pontoembarque;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AtualizacaoPontoEmbarqueRequest(
        @NotBlank @Size(max = 150) String nome,
        @Size(max = 256) String descricao
) {}
