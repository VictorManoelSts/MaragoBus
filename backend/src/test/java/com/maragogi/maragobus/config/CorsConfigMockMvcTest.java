package com.maragogi.maragobus.config;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.filter.CorsFilter;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class CorsConfigMockMvcTest {

    @RestController
    static class CorsProbeController {
        @GetMapping("/api/cors-probe")
        String get() {
            return "ok";
        }

        @PostMapping("/api/cors-probe")
        String post() {
            return "created";
        }
    }

    private MockMvc mockMvcComOrigens(List<String> origens) {
        CorsProperties props = new CorsProperties();
        props.setAllowedOrigins(origens);
        props.validar();
        CorsConfig config = new CorsConfig(props);

        return MockMvcBuilders.standaloneSetup(new CorsProbeController())
                .addFilters(new CorsFilter(config.corsConfigurationSource()))
                .build();
    }

    @Test
    void devePermitirPreflightOptionsParaOrigemLocalConfigurada() throws Exception {
        MockMvc mockMvc = mockMvcComOrigens(List.of("http://localhost:5173", "http://127.0.0.1:5173"));

        mockMvc.perform(options("/api/cors-probe")
                        .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Authorization, Content-Type"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS,
                        org.hamcrest.Matchers.containsString("POST")))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS,
                        org.hamcrest.Matchers.containsString("Authorization")));
    }

    @Test
    void deveBloquearPreflightOptionsParaOrigemNaoPermitida() throws Exception {
        MockMvc mockMvc = mockMvcComOrigens(List.of("http://localhost:5173"));

        mockMvc.perform(options("/api/cors-probe")
                        .header(HttpHeaders.ORIGIN, "https://origem-nao-autorizada.example.com")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }

    @Test
    void devePermitirGetEPostComOrigemPermitida() throws Exception {
        MockMvc mockMvc = mockMvcComOrigens(List.of("http://localhost:5173", "http://127.0.0.1:5173"));

        mockMvc.perform(get("/api/cors-probe")
                        .header(HttpHeaders.ORIGIN, "http://localhost:5173"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"));

        mockMvc.perform(post("/api/cors-probe")
                        .header(HttpHeaders.ORIGIN, "http://127.0.0.1:5173"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://127.0.0.1:5173"));
    }

    @Test
    void deveBloquearGetEPostParaOrigemInesperada() throws Exception {
        MockMvc mockMvc = mockMvcComOrigens(List.of("http://localhost:5173"));

        mockMvc.perform(get("/api/cors-probe")
                        .header(HttpHeaders.ORIGIN, "https://origem-nao-autorizada.example.com"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));

        mockMvc.perform(post("/api/cors-probe")
                        .header(HttpHeaders.ORIGIN, "https://origem-nao-autorizada.example.com"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }

    @Test
    void deveManterProducaoFechadaQuandoNenhumaOrigemForConfigurada() throws Exception {
        MockMvc mockMvc = mockMvcComOrigens(List.of());

        mockMvc.perform(options("/api/cors-probe")
                        .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }
}