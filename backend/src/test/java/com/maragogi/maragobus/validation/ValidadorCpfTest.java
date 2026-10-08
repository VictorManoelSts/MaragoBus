package com.maragogi.maragobus.validation;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ValidadorCpfTest {

    @Test
    void deveAceitarCpfValido() {
        String cpf = "52998224725";

        assertTrue(ValidadorCpf.ehValido(cpf));
    }

    @Test
    void deveRejeitarCpfComDigitoIncorreto() {
        String cpf = "52998224726";

        assertFalse(ValidadorCpf.ehValido(cpf));
    }

    @Test
    void deveRejeitarCpfComNumerosRepetidos() {
        String cpf = "11111111111";

        assertFalse(ValidadorCpf.ehValido(cpf));
    }

    @Test
    void deveRejeitarCpfComQuantidadeIncorreta() {
        String cpf = "123456789";

        assertFalse(ValidadorCpf.ehValido(cpf));
    }

    @Test
    void deveRejeitarCpfNulo() {
        assertFalse(ValidadorCpf.ehValido(null));
    }
}