package com.maragogi.maragobus.repository.projection;

import java.util.UUID;

public record ResumoReservasPorFaculdadePonto(UUID faculdadeId, String faculdadeNome,
                                            UUID pontoEmbarqueId, String pontoEmbarqueNome, Long totalReservas) {}
