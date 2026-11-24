package com.maragogi.maragobus.dto.distribuicao;

import com.maragogi.maragobus.enums.StatusDistribuicaoTransporte;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record DistribuicaoTransporteResponse(
        UUID id,
        LocalDate dataUtilizacao,
        StatusDistribuicaoTransporte status,
        Long versao,
        int numeroRevisao,
        UUID ultimoEditorId,
        String ultimoEditorNome,
        LocalDateTime dataHoraUltimaEdicao,
        UUID publicadoPorId,
        String publicadoPorNome,
        LocalDateTime dataHoraPublicacao,
        List<ItemDistribuicaoResponse> itens
) {}