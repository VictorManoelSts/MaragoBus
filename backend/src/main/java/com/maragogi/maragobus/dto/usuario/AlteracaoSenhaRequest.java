package com.maragogi.maragobus.dto.usuario;

import jakarta.validation.constraints.NotBlank;
import com.maragogi.maragobus.validation.SenhaValida;

public record AlteracaoSenhaRequest(

        @NotBlank
        String senhaAtual,

        @SenhaValida
        String novaSenha

) {}
