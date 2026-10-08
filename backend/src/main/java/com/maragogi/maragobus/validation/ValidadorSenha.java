package com.maragogi.maragobus.validation;

import com.maragogi.maragobus.exception.RegraNegocioException;

import java.nio.charset.StandardCharsets;

public final class ValidadorSenha {

    public static final String MENSAGEM =
            "A senha deve conter pelo menos 8 caracteres, não pode ser vazia e deve ter no máximo 72 bytes em UTF-8.";

    private ValidadorSenha() {}

    public static boolean ehValida(String senha) {
        return senha != null
                && !senha.isBlank()
                && senha.codePointCount(0, senha.length()) >= 8
                && senha.getBytes(StandardCharsets.UTF_8).length <= 72;
    }

    public static void validar(String senha) {
        if (!ehValida(senha)) {
            throw new RegraNegocioException(MENSAGEM);
        }
    }
}
