package com.maragogi.maragobus.dto.solicitacaoadvertencia;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RecusaSolicitacaoAdvertenciaRequest(@NotBlank @Size(max = 1000) String observacaoAnalise) {}
