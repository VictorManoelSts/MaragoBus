package com.maragogi.maragobus.dto.solicitacaoadvertencia;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record CriacaoSolicitacaoAdvertenciaRequest(@NotNull UUID alunoId,
                                                  @NotBlank @Size(max = 1000) String descricao) {}
