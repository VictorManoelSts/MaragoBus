package com.maragogi.maragobus.dto.solicitacaoadvertencia;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AprovacaoSolicitacaoAdvertenciaRequest(
        @Size(max = 1000)
        @Pattern(regexp = "(?s).*[^\\p{javaWhitespace}].*", message = "A observação informada não pode conter apenas espaços.")
        String observacaoAnalise,
        Integer duracaoSuspensaoDias) {

    public AprovacaoSolicitacaoAdvertenciaRequest(String observacaoAnalise) {
        this(observacaoAnalise, null);
    }
}
