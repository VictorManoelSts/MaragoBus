package com.maragogi.maragobus.controller;

import com.maragogi.maragobus.dto.cursoofertado.CadastroCursoOfertadoRequest;
import com.maragogi.maragobus.dto.cursoofertado.CursoOfertadoResponse;
import com.maragogi.maragobus.enums.ModalidadeEnsino;
import com.maragogi.maragobus.exception.RecursoNaoEncontradoException;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.service.CursoOfertadoService;
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

@WebMvcTest(CursoOfertadoController.class)
@ActiveProfiles("curso-local")
@WithMockUser
class CursoOfertadoControllerTest {
    private static final String ROTA = "/api/cursos-ofertados";
    private static final UUID ID = UUID.fromString("123e4567-e89b-12d3-a456-426614174000");

    private static final UUID CURSO = UUID.randomUUID();
    private static final UUID FACULDADE = UUID.randomUUID();
    private static final String CORPO = """
            {"cursoId":"%s","faculdadeId":"%s","modalidadeEnsino":"PRESENCIAL"}
            """.formatted(CURSO, FACULDADE);
    private static final CadastroCursoOfertadoRequest DADOS =
            new CadastroCursoOfertadoRequest(CURSO, FACULDADE, ModalidadeEnsino.PRESENCIAL);

    private CursoOfertadoResponse resposta(boolean ativo) {
        return new CursoOfertadoResponse(ID, CURSO, "Curso Alfa", FACULDADE, "Faculdade Alfa",
                ModalidadeEnsino.PRESENCIAL, ativo);
    }

    @Autowired private MockMvc mvc;
    @MockitoBean private CursoOfertadoService service;

    @Test
    void cadastraComLocationEDto() throws Exception {
        when(service.cadastrar(DADOS))
                .thenReturn(resposta(true));

        mvc.perform(post(ROTA).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(CORPO))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "http://localhost" + ROTA + "/" + ID))
                .andExpect(jsonPath("$.id").value(ID.toString()))
                .andExpect(jsonPath("$.cursoId").value(CURSO.toString()))
                .andExpect(jsonPath("$.ativo").value(true));
    }

    @Test
    void consultaPorUuidInclusiveInativo() throws Exception {
        when(service.buscarPorId(ID)).thenReturn(resposta(false));

        mvc.perform(get(ROTA + "/{id}", ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(ID.toString()))
                .andExpect(jsonPath("$.ativo").value(false));
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void listaComPaginacaoERepassaFiltro(boolean somenteAtivos) throws Exception {
        var pagina = PageRequest.of(0, 1, Sort.by("curso.nome", "faculdade.nome", "modalidadeEnsino", "id"));
        when(service.listar(pagina, somenteAtivos, FACULDADE))
                .thenReturn(new PageImpl<>(List.of(resposta(somenteAtivos)), pagina, 2));

        mvc.perform(get(ROTA).param("size", "1").param("faculdadeId", FACULDADE.toString()).param("somenteAtivos", Boolean.toString(somenteAtivos)))
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
        when(service.atualizarDados(ID, DADOS))
                .thenReturn(resposta(false));

        mvc.perform(put(ROTA + "/{id}", ID).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(CORPO))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(ID.toString()))
                .andExpect(jsonPath("$.modalidadeEnsino").value("PRESENCIAL"))
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
        var pagina = PageRequest.of(0, 20, Sort.by("curso.nome", "faculdade.nome", "modalidadeEnsino", "id"));
        when(service.listar(pagina, false, null)).thenReturn(org.springframework.data.domain.Page.empty(pagina));

        mvc.perform(get(ROTA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isEmpty())
                .andExpect(jsonPath("$.page.number").value(0))
                .andExpect(jsonPath("$.page.size").value(20));
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{", "SEM_CURSO", "SEM_FACULDADE", "SEM_MODALIDADE", "INVALIDA", "1"})
    void rejeitaCorpoInvalidoNaCriacaoENaAtualizacao(String corpo) throws Exception {
        String json = switch (corpo) {
            case "SEM_CURSO" -> CORPO.replace("\"cursoId\":\"" + CURSO + "\"", "\"cursoId\":null");
            case "SEM_FACULDADE" -> CORPO.replace("\"faculdadeId\":\"" + FACULDADE + "\"", "\"faculdadeId\":null");
            case "SEM_MODALIDADE" -> CORPO.replace("\"PRESENCIAL\"", "null");
            case "INVALIDA" -> CORPO.replace("PRESENCIAL", "INVALIDA");
            case "1" -> CORPO.replace("\"PRESENCIAL\"", "1");
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
        mvc.perform(get(ROTA).param("faculdadeId", "invalido")).andExpect(status().isBadRequest());
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
        var erro = new RecursoNaoEncontradoException("Curso ofertado não encontrado.");
        when(service.buscarPorId(ID)).thenThrow(erro);
        when(service.atualizarDados(eq(ID), any())).thenThrow(erro);
        doThrow(erro).when(service).desativar(ID);
        doThrow(erro).when(service).reativar(ID);

        mvc.perform(get(ROTA + "/{id}", ID))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Curso ofertado não encontrado."));
        mvc.perform(put(ROTA + "/{id}", ID).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(CORPO))
                .andExpect(status().isNotFound());
        mvc.perform(delete(ROTA + "/{id}", ID).with(csrf())).andExpect(status().isNotFound());
        mvc.perform(put(ROTA + "/{id}/reativacao", ID).with(csrf())).andExpect(status().isNotFound());
    }

    @ParameterizedTest
    @ValueSource(strings = {"Curso não encontrado.", "Faculdade não encontrada."})
    void retorna404ParaVinculoInexistente(String mensagem) throws Exception {
        var erro = new RecursoNaoEncontradoException(mensagem);
        when(service.cadastrar(DADOS)).thenThrow(erro);
        when(service.atualizarDados(ID, DADOS)).thenThrow(erro);

        mvc.perform(post(ROTA).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(CORPO))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value(mensagem));
        mvc.perform(put(ROTA + "/{id}", ID).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(CORPO))
                .andExpect(status().isNotFound());
    }

    @ParameterizedTest
    @ValueSource(strings = {"Já existe uma oferta para este curso, faculdade e modalidade de ensino.",
            "O curso está inativo.", "A faculdade está inativa."})
    void retorna409ParaDuplicidadeOuVinculoInativo(String mensagem) throws Exception {
        var erro = new RegraNegocioException(mensagem);
        when(service.cadastrar(any())).thenThrow(erro);
        when(service.atualizarDados(eq(ID), any())).thenThrow(erro);

        mvc.perform(post(ROTA).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(CORPO))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(erro.getMessage()));
        mvc.perform(put(ROTA + "/{id}", ID).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(CORPO))
                .andExpect(status().isConflict());
    }

    @Test
    void retorna409ParaUnicidadeDetectadaNoBanco() throws Exception {
        when(service.cadastrar(any())).thenThrow(new DataIntegrityViolationException(
                "Restrição de unicidade", new SQLException("Oferta duplicada", "23505")));

        mvc.perform(post(ROTA).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(CORPO))
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
