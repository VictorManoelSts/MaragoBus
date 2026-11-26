package com.maragogi.maragobus.config;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class CorsPropertiesTest {

    @Test
    void deveIniciarFechadoPorPadraoSemOrigensPermitidas() {
        CorsProperties props = new CorsProperties();
        props.validar();

        assertTrue(props.getAllowedOrigins().isEmpty());
        assertFalse(props.isAllowCredentials());
    }

    @Test
    void deveLimparEspacosEEntradasVaziasDasOrigens() {
        CorsProperties props = new CorsProperties();
        props.setAllowedOrigins(List.of(" http://localhost:5173 ", "  ", "http://127.0.0.1:5173"));
        props.validar();

        assertEquals(List.of("http://localhost:5173", "http://127.0.0.1:5173"), props.getAllowedOrigins());
    }

    @Test
    void deveRejeitarWildcardComCredenciais() {
        CorsProperties props = new CorsProperties();
        props.setAllowedOrigins(List.of("*"));
        props.setAllowCredentials(true);

        IllegalStateException erro = assertThrows(IllegalStateException.class, props::validar);
        assertTrue(erro.getMessage().contains("allow-credentials=true"));
    }

    @Test
    void deveRejeitarWildcardMesmoSemCredenciais() {
        CorsProperties props = new CorsProperties();
        props.setAllowedOrigins(List.of("http://localhost:*"));
        props.setAllowCredentials(false);

        assertThrows(IllegalStateException.class, props::validar);
    }
}