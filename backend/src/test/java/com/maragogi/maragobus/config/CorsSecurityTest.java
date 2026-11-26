package com.maragogi.maragobus.config;

import com.maragogi.maragobus.controller.CursoController;
import com.maragogi.maragobus.service.CursoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CursoController.class)
@Import(CorsConfig.class)
@ActiveProfiles("curso-local")
class CorsSecurityTest {

    private static final String ROTA = "/api/cursos";
    private static final String PORTAL = "http://localhost:5173";

    @Autowired private MockMvc mvc;
    @MockitoBean private CursoService service;

    @ParameterizedTest
    @ValueSource(strings = {PORTAL, "http://localhost:5174"})
    void permitePreflightDoFrontendSemAutenticacao(String origem) throws Exception {
        mvc.perform(options(ROTA)
                        .header(HttpHeaders.ORIGIN, origem)
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Authorization, Content-Type, X-CSRF-TOKEN"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, origem))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS, containsString("POST")))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS, containsString("Authorization")))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS, containsString("Content-Type")))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS, containsString("X-CSRF-TOKEN")));
    }

    @Test
    void rejeitaPreflightDeOrigemNaoConfigurada() throws Exception {
        mvc.perform(options(ROTA)
                        .header(HttpHeaders.ORIGIN, "http://localhost:5175")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }

    @Test
    void exigeAutenticacaoEmRequisicaoDaOrigemPermitida() throws Exception {
        mvc.perform(get(ROTA).header(HttpHeaders.ORIGIN, PORTAL).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, PORTAL));
    }

    @Test
    void exigeCsrfEmPostAutenticadoDaOrigemPermitida() throws Exception {
        mvc.perform(post(ROTA).header(HttpHeaders.ORIGIN, PORTAL).with(user("usuario")))
                .andExpect(status().isForbidden())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, PORTAL));
    }
}
