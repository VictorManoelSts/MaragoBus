package com.maragogi.maragobus.dto.cursoofertado;

import com.maragogi.maragobus.enums.ModalidadeEnsino;

import java.util.UUID;

public record CursoOfertadoResponse(
        UUID id,
        UUID cursoId,
        String cursoNome,
        UUID faculdadeId,
        String faculdadeNome,
        ModalidadeEnsino modalidadeEnsino,
        boolean ativo
) {}
