package com.maragogi.maragobus.dto.reserva;

import java.time.LocalDate;
import java.util.UUID;

public record PassageiroConfirmadoResponse(UUID reservaId, UUID alunoId, String alunoNome, LocalDate dataUtilizacao,
                                           UUID faculdadeId, String faculdadeNome,
                                           UUID pontoEmbarqueId, String pontoEmbarqueNome) {}
