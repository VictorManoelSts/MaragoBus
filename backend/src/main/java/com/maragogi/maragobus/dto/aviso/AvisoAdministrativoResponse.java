package com.maragogi.maragobus.dto.aviso;

import com.maragogi.maragobus.enums.EscopoAviso;

import java.time.LocalDateTime;
import java.util.UUID;

public record AvisoAdministrativoResponse(
        UUID id,
        String titulo,
        String conteudo,
        EscopoAviso escopo,
        UUID faculdadeDestinoId,
        String faculdadeDestinoNome,
        UUID administradorResponsavelId,
        String administradorResponsavelNome,
        LocalDateTime dataHoraPublicacao,
        boolean arquivado,
        LocalDateTime dataHoraArquivamento,
        UUID arquivadoPorId,
        String arquivadoPorNome
) {}