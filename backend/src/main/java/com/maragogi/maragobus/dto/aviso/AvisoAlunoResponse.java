package com.maragogi.maragobus.dto.aviso;

import com.maragogi.maragobus.enums.EscopoAviso;

import java.time.LocalDateTime;
import java.util.UUID;

public record AvisoAlunoResponse(
        UUID id,
        String titulo,
        String conteudo,
        EscopoAviso escopo,
        UUID faculdadeDestinoId,
        String faculdadeDestinoNome,
        LocalDateTime dataHoraPublicacao,
        boolean lido,
        LocalDateTime dataHoraLeitura
) {}