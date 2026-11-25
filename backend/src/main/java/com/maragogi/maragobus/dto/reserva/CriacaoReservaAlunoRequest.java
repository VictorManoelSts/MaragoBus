package com.maragogi.maragobus.dto.reserva;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CriacaoReservaAlunoRequest(@NotNull UUID pontoEmbarqueId) {}
