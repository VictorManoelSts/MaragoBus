package com.maragogi.maragobus.dto.distribuicao;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record PublicarDistribuicaoRequest(
        @NotNull(message = "A data de utilização é obrigatória.")
        LocalDate dataUtilizacao,
        @NotNull(message = "A versão esperada é obrigatória para publicação.")
        Long versaoEsperada
) {}