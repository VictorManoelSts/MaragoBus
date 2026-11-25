package com.maragogi.maragobus.controller;

import com.maragogi.maragobus.dto.pontoembarque.AtualizacaoPontoEmbarqueRequest;
import com.maragogi.maragobus.dto.pontoembarque.CadastroPontoEmbarqueRequest;
import com.maragogi.maragobus.dto.pontoembarque.PontoEmbarqueResponse;
import com.maragogi.maragobus.exception.RecursoNaoEncontradoException;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.service.PontoEmbarqueService;
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

@WebMvcTest(PontoEmbarqueController.class)
@ActiveProfiles("curso-local")
@WithMockUser
class PontoEmbarqueControllerTest {
    private static final String ROTA = "/api/pontos-embarque";
    private static final UUID ID = UUID.fromString("123e4567-e89b-12d3-a456-426614174000");

    @Autowired private MockMvc mvc;
    @MockitoBean private PontoEmbarqueService service;

    @Test
    void cadastraComLocationEDto() throws Exception {
        when(service.cadastrar(new CadastroPontoEmbarqueRequest(" Ponto Alfa ", "Ao lado da praça")))
                .thenReturn(new PontoEmbarqueResponse(ID, "Ponto Alfa", "Ao lado da praça", true));

        mvc.perform(post(ROTA).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\" Ponto Alfa \",\"descricao\":\"Ao lado da praça\"}"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "http://localhost" + ROTA + "/" + ID))
                .andExpect(jsonPath("$.id").value(ID.toString()))
                .andExpect(jsonPath("$.nome").value("Ponto Alfa"))
                .andExpect(jsonPath("$.descricao").value("Ao lado da praça"))
                .andExpect(jsonPath("$.ativo").value(true));
    }

    @Test
    void consultaPorUuidInclusiveInativo() throws Exception {
        when(service.buscarPorId(ID)).thenReturn(new PontoEmbarqueResponse(ID, "Ponto Alfa", null, false));

        mvc.perform(get(ROTA + "/{id}", ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(ID.toString()))
                .andExpect(jsonPath("$.ativo").value(false));
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void listaComPaginacaoERepassaFiltro(boolean somenteAtivos) throws Exception {
        var pagina = PageRequest.of(1, 1, Sort.by("nome", "id"));
        when(service.listar(pagina, somenteAtivos))
                .thenReturn(new PageImpl<>(List.of(new PontoEmbarqueResponse(ID, "Ponto Alfa", null, somenteAtivos)), pagina, 2));

        mvc.perform(get(ROTA).param("page", "1").param("size", "1").param("somenteAtivos", Boolean.toString(somenteAtivos)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(ID.toString()))
                .andExpect(jsonPath("$.content[0].ativo").value(somenteAtivos))
                .andExpect(jsonPath("$.page.number").value(1))
                .andExpect(jsonPath("$.page.size").value(1))
                .andExpect(jsonPath("$.page.totalElements").value(2))
                .andExpect(jsonPath("$.page.totalPages").value(2));
    }

    @Test
    void atualizaComDto() throws Exception {
        when(service.atualizarDados(ID, new AtualizacaoPontoEmbarqueRequest("Ponto Beta", "Rua Beta")))
                .thenReturn(new PontoEmbarqueResponse(ID, "Ponto Beta", "Rua Beta", false));

        mvc.perform(put(ROTA + "/{id}", ID).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Ponto Beta\",\"descricao\":\"Rua Beta\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(ID.toString()))
                .andExpect(jsonPath("$.nome").value("Ponto Beta"))
                .andExpect(jsonPath("$.descricao").value("Rua Beta"))
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
    @ValueSource(strings = {"{}", "{\"nome\":null}", "{\"nome\":\"  \"}", "{", "longo", "descricaoLonga"})
    void rejeitaCorpoInvalidoNaCriacaoENaAtualizacao(String corpo) throws Exception {
        String json = switch (corpo) {
            case "longo" -> "{\"nome\":\"" + "a".repeat(151) + "\"}";
            case "descricaoLonga" -> "{\"nome\":\"Ponto Alfa\",\"descricao\":\"" + "a".repeat(257) + "\"}";
            default -> corpo;
        };
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
        var erro = new RecursoNaoEncontradoException("Ponto de embarque não encontrado.");
        when(service.buscarPorId(ID)).thenThrow(erro);
        when(service.atualizarDados(eq(ID), any())).thenThrow(erro);
        doThrow(erro).when(service).desativar(ID);
        doThrow(erro).when(service).reativar(ID);

        mvc.perform(get(ROTA + "/{id}", ID))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Ponto de embarque não encontrado."));
        mvc.perform(put(ROTA + "/{id}", ID).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Ponto Alfa\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(delete(ROTA + "/{id}", ID).with(csrf())).andExpect(status().isNotFound());
        mvc.perform(put(ROTA + "/{id}/reativacao", ID).with(csrf())).andExpect(status().isNotFound());
    }

    @Test
    void retorna409ParaNomeDuplicado() throws Exception {
        var erro = new RegraNegocioException("Já existe um ponto de embarque com este nome.");
        when(service.cadastrar(any())).thenThrow(erro);
        when(service.atualizarDados(eq(ID), any())).thenThrow(erro);

        mvc.perform(post(ROTA).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Ponto Alfa\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(erro.getMessage()));
        mvc.perform(put(ROTA + "/{id}", ID).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Ponto Alfa\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void retorna409ParaUnicidadeDetectadaNoBanco() throws Exception {
        when(service.cadastrar(any())).thenThrow(new DataIntegrityViolationException(
                "Restrição de unicidade", new SQLException("Nome duplicado", "23505")));

        mvc.perform(post(ROTA).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Ponto Alfa\"}"))
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
