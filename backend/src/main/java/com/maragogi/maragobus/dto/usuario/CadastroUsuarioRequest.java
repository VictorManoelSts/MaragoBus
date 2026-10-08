package com.maragogi.maragobus.dto.usuario;

import jakarta.validation.constraints.*;
import com.maragogi.maragobus.validation.SenhaValida;

public record CadastroUsuarioRequest(

        @NotBlank
        @Size(max = 120)
        String nome,

        @NotBlank
        @Pattern(regexp = "\\d{11}",
                message = "CPF deve conter 11 dígitos")
        String cpf,

        @NotBlank
        @Pattern(regexp = "\\d{10,11}",
                message = "Telefone deve conter 10 ou 11 dígitos")
        String telefone,

        @NotBlank
        @Size(max = 256)
        String endereco,

        @Size(max = 500)
        String foto,

        @NotBlank
        @Email
        @Size(max = 256)
        String email,

        @SenhaValida
        String senha

) {}
