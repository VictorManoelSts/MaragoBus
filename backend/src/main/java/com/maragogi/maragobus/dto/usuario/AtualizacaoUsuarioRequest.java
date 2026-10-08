package com.maragogi.maragobus.dto.usuario;

import jakarta.validation.constraints.*;

public record AtualizacaoUsuarioRequest(

        @NotBlank
        @Size(max = 120)
        String nome,

        @NotBlank
        @Pattern(
                regexp = "\\d{10,11}",
                message = "Telefone deve conter 10 ou 11 dígitos"
        )
        String telefone,

        @NotBlank
        @Size(max = 256)
        String endereco,

        @Size(max = 500)
        String foto,

        @NotBlank
        @Email
        @Size(max = 256)
        String email

) {}