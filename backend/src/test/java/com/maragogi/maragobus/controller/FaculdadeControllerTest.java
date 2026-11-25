package com.maragogi.maragobus.controller;

import com.maragogi.maragobus.dto.faculdade.AtualizacaoFaculdadeRequest;
import com.maragogi.maragobus.dto.faculdade.CadastroFaculdadeRequest;
import com.maragogi.maragobus.dto.faculdade.FaculdadeResponse;
import com.maragogi.maragobus.exception.RecursoNaoEncontradoException;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.service.FaculdadeService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.sql.SQLException;
import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.anonymous;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FaculdadeController.class)
@ActiveProfiles("curso-local")
@WithMockUser
class FaculdadeControllerTest {
    private static final String ROTA = "/api/faculdades";
    private static final UUID ID = UUID.fromString("123e4567-e89b-12d3-a456-426614174000");

    @Autowired private MockMvc mvc;
    @MockitoBean private FaculdadeService service;

    @Test
    void cadastraComLocationEDto() throws Exception {
        when(service.cadastrar(new CadastroFaculdadeRequest(" Faculdade Alfa ")))
                .thenReturn(new FaculdadeResponse(ID, "Faculdade Alfa", true));

        mvc.perform(post(ROTA).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\" Faculdade Alfa \"}"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "http://localhost" + ROTA + "/" + ID))
                .andExpect(jsonPath("$.id").value(ID.toString()))
                .andExpect(jsonPath("$.nome").value("Faculdade Alfa"))
                .andExpect(jsonPath("$.ativo").value(true));
    }

    @Test
    void consultaPorUuidInclusiveInativo() throws Exception {
        when(service.buscarPorId(ID)).thenReturn(new FaculdadeResponse(ID, "Faculdade Alfa", false));

        mvc.perform(get(ROTA + "/{id}", ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(ID.toString()))
                .andExpect(jsonPath("$.ativo").value(false));
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void listaComPaginacaoERepassaFiltro(boolean somenteAtivos) throws Exception {
        var pagina = PageRequest.of(0, 1, Sort.by("nome", "id"));
        when(service.listar(pagina, somenteAtivos))
                .thenReturn(new PageImpl<>(List.of(new FaculdadeResponse(ID, "Faculdade Alfa", somenteAtivos)), pagina, 2));

        mvc.perform(get(ROTA).param("size", "1").param("somenteAtivos", Boolean.toString(somenteAtivos)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(ID.toString()))
                .andExpect(jsonPath("$.content[0].ativo").value(somenteAtivos))
                .andExpect(jsonPath("$.page.number").value(0))
                .andExpect(jsonPath("$.page.size").value(1))
                .andExpect(jsonPath("$.page.totalElements").value(2))
                .andExpect(jsonPath("$.page.totalPages").value(2));
    }

    @Test
    void atualizaComDto() throws Exception {
        when(service.atualizarDados(ID, new AtualizacaoFaculdadeRequest("Faculdade Beta")))
                .thenReturn(new FaculdadeResponse(ID, "Faculdade Beta", false));

        mvc.perform(put(ROTA + "/{id}", ID).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Faculdade Beta\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(ID.toString()))
                .andExpect(jsonPath("$.nome").value("Faculdade Beta"))
                .andExpect(jsonPath("$.ativo").value(false));
    }

    @Test
    void desativaSemCorpo() throws Exception {
        mvc.perform(delete(ROTA + "/{id}", ID).with(csrf()))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));
        verify(service).desativar(ID);
    }

    @Test
    void reativaSemCorpo() throws Exception {
        mvc.perform(put(ROTA + "/{id}/reativacao", ID).with(csrf()))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));
        verify(service).reativar(ID);
    }

    @Test
    void usaParametrosPadraoDaListagem() throws Exception {
        var pagina = PageRequest.of(0, 20, Sort.by("nome", "id"));
        when(service.listar(pagina, false)).thenReturn(org.springframework.data.domain.Page.empty(pagina));

        mvc.perform(get(ROTA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isEmpty())
                .andExpect(jsonPath("$.page.number").value(0))
                .andExpect(jsonPath("$.page.size").value(20));
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"nome\":null}", "{\"nome\":\"  \"}", "{", "longo"})
    void rejeitaCorpoInvalidoNaCriacaoENaAtualizacao(String corpo) throws Exception {
        String json = corpo.equals("longo") ? "{\"nome\":\"" + "a".repeat(151) + "\"}" : corpo;
        mvc.perform(post(ROTA).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isBadRequest());
        mvc.perform(put(ROTA + "/{id}", ID).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    void rejeitaUuidEPaginacaoInvalidos() throws Exception {
        mvc.perform(get(ROTA + "/invalido")).andExpect(status().isBadRequest());
        mvc.perform(get(ROTA).param("page", "-1")).andExpect(status().isBadRequest());
        mvc.perform(get(ROTA).param("size", "0")).andExpect(status().isBadRequest());
        mvc.perform(get(ROTA).param("size", "101")).andExpect(status().isBadRequest());
        mvc.perform(get(ROTA).param("page", "abc")).andExpect(status().isBadRequest());
        mvc.perform(get(ROTA).param("somenteAtivos", "abc")).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    void retorna404NasOperacoesPorId() throws Exception {
        var erro = new RecursoNaoEncontradoException("Faculdade não encontrada.");
        when(service.buscarPorId(ID)).thenThrow(erro);
        when(service.atualizarDados(eq(ID), any())).thenThrow(erro);
        doThrow(erro).when(service).desativar(ID);
        doThrow(erro).when(service).reativar(ID);

        mvc.perform(get(ROTA + "/{id}", ID))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Faculdade não encontrada."));
        mvc.perform(put(ROTA + "/{id}", ID).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Faculdade Alfa\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(delete(ROTA + "/{id}", ID).with(csrf())).andExpect(status().isNotFound());
        mvc.perform(put(ROTA + "/{id}/reativacao", ID).with(csrf())).andExpect(status().isNotFound());
    }

    @Test
    void retorna409ParaNomeDuplicado() throws Exception {
        var erro = new RegraNegocioException("Já existe uma faculdade com este nome.");
        when(service.cadastrar(any())).thenThrow(erro);
        when(service.atualizarDados(eq(ID), any())).thenThrow(erro);

        mvc.perform(post(ROTA).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Faculdade Alfa\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(erro.getMessage()));
        mvc.perform(put(ROTA + "/{id}", ID).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Faculdade Alfa\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void retorna409ParaUnicidadeDetectadaNoBanco() throws Exception {
        when(service.cadastrar(any())).thenThrow(new DataIntegrityViolationException(
                "Restrição de unicidade", new SQLException("Nome duplicado", "23505")));

        mvc.perform(post(ROTA).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Faculdade Alfa\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void exigeAutenticacao() throws Exception {
        mvc.perform(get(ROTA).with(anonymous()).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @Test
    void exigeCsrfEmOperacaoDeEscrita() throws Exception {
        mvc.perform(delete(ROTA + "/{id}", ID)).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }
}
