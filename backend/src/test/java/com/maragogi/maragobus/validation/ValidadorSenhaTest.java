package com.maragogi.maragobus.validation;

import com.maragogi.maragobus.dto.usuario.AlteracaoSenhaRequest;
import com.maragogi.maragobus.dto.usuario.CadastroUsuarioRequest;
import com.maragogi.maragobus.exception.RegraNegocioException;
import jakarta.validation.Validation;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

class ValidadorSenhaTest {

    static Stream<String> invalidas() {
        return Stream.of(null, "", "        ", "1234567", "a".repeat(73),
                "é".repeat(37), "a".repeat(71) + "é", "😀".repeat(19), "😀".repeat(7));
    }

    static Stream<String> validas() {
        return Stream.of("12345678", "a".repeat(72), "é".repeat(36),
                "😀".repeat(18), "😀".repeat(8), " senha válida ");
    }

    @ParameterizedTest
    @MethodSource("invalidas")
    void deveRejeitarSenhaInvalidaNoValidadorENosDtos(String senha) {
        assertFalse(ValidadorSenha.ehValida(senha));
        assertThrows(RegraNegocioException.class, () -> ValidadorSenha.validar(senha));
        validarDtos(senha, false);
    }

    @ParameterizedTest
    @MethodSource("validas")
    void deveAceitarSenhaValidaNoValidadorENosDtos(String senha) {
        assertTrue(ValidadorSenha.ehValida(senha));
        assertDoesNotThrow(() -> ValidadorSenha.validar(senha));
        validarDtos(senha, true);
    }

    private void validarDtos(String senha, boolean valida) {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            var cadastro = new CadastroUsuarioRequest("Aluno", "52998224725", "82999999999",
                    "Rua Teste", null, "aluno@exemplo.com", senha);
            var alteracao = new AlteracaoSenhaRequest("SenhaAtual123!", senha);
            assertEquals(valida, validator.validate(cadastro).isEmpty());
            assertEquals(valida, validator.validate(alteracao).isEmpty());
        }
    }
}
