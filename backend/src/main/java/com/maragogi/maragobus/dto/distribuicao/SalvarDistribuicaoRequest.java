package com.maragogi.maragobus.dto.distribuicao;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record SalvarDistribuicaoRequest(
        @NotNull(message = "A data de utilização é obrigatória.")
        LocalDate dataUtilizacao,
        Long versaoEsperada,
        @NotNull(message = "A lista de itens da distribuição é obrigatória.")
        List<@Valid @NotNull(message = "O item da distribuição é obrigatório.") ItemDistribuicaoRequest> itens
) {}