package com.maragogi.maragobus.dto.pontoembarque;

import java.util.UUID;

public record PontoEmbarqueResponse(UUID id, String nome, String descricao, boolean ativo) {}
