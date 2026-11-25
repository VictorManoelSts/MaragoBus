package com.maragogi.maragobus.integration;

import com.maragogi.maragobus.dto.curso.CadastroCursoRequest;
import com.maragogi.maragobus.dto.cursoofertado.CadastroCursoOfertadoRequest;
import com.maragogi.maragobus.entity.Curso;
import com.maragogi.maragobus.entity.CursoOfertado;
import com.maragogi.maragobus.entity.Faculdade;
import com.maragogi.maragobus.enums.ModalidadeEnsino;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.CursoOfertadoRepository;
import com.maragogi.maragobus.repository.CursoRepository;
import com.maragogi.maragobus.repository.FaculdadeRepository;
import com.maragogi.maragobus.service.CursoOfertadoService;
import com.maragogi.maragobus.service.CursoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.transaction.annotation.Transactional;

import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Import(PostgresTestConfiguration.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class CursoIntegrationTest {
    @Autowired private CursoService cursos;
    @Autowired private CursoOfertadoService ofertas;
    @Autowired private CursoRepository repositorio;
    @Autowired private FaculdadeRepository faculdades;
    @Autowired private CursoOfertadoRepository ofertasRepository;

    @Test
    void persisteDesativacaoFiltraPaginacaoEImpedeNovaOferta() {
        var desativado = cursos.cadastrar(new CadastroCursoRequest("Curso fictício A"));
        var ativo = cursos.cadastrar(new CadastroCursoRequest("Curso fictício B"));
        var faculdade = faculdades.save(Faculdade.builder().nome("Faculdade fictícia").build());
        var oferta = ofertas.cadastrar(new CadastroCursoOfertadoRequest(
                desativado.id(), faculdade.getId(), ModalidadeEnsino.PRESENCIAL));

        cursos.desativar(desativado.id());

        var pagina = PageRequest.of(0, 1, Sort.by("nome", "id"));
        var todos = cursos.listar(pagina, false);
        assertThat(todos.getTotalElements()).isEqualTo(2);
        assertThat(todos.getContent()).containsExactly(cursos.buscarPorId(desativado.id()));
        assertThat(todos.getContent().getFirst().ativo()).isFalse();
        assertThat(cursos.listar(pagina.next(), false).getContent()).containsExactly(ativo);

        var ativos = cursos.listar(pagina, true);
        assertThat(ativos.getTotalElements()).isEqualTo(1);
        assertThat(ativos.getContent()).containsExactly(ativo);
        assertThat(ofertas.buscarPorId(oferta.id())).isEqualTo(oferta);
        assertThatThrownBy(() -> ofertas.cadastrar(new CadastroCursoOfertadoRequest(
                desativado.id(), faculdade.getId(), ModalidadeEnsino.EAD)))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessage("O curso está inativo.");
    }

    @Test
    @Transactional
    void postgresImpedeNomeDuplicadoMesmoQuandoOCursoEstaInativo() {
        repositorio.saveAndFlush(Curso.builder().nome("Curso fictício único").ativo(false).build());

        assertThatThrownBy(() -> repositorio.saveAndFlush(Curso.builder().nome("Curso fictício único").build()))
                .isInstanceOf(DataIntegrityViolationException.class)
                .rootCause()
                .isInstanceOfSatisfying(SQLException.class, erro -> assertThat(erro.getSQLState()).isEqualTo("23505"));
    }

    @Test
    @Transactional
    void postgresImpedeOfertaDuplicadaMesmoQuandoInativa() {
        var curso = repositorio.save(Curso.builder().nome("Curso da oferta única").build());
        var faculdade = faculdades.save(Faculdade.builder().nome("Faculdade da oferta única").build());
        var oferta = ofertasRepository.saveAndFlush(CursoOfertado.builder().curso(curso).faculdade(faculdade)
                .modalidadeEnsino(ModalidadeEnsino.PRESENCIAL).ativo(false).build());
        var dados = new CadastroCursoOfertadoRequest(curso.getId(), faculdade.getId(), ModalidadeEnsino.PRESENCIAL);
        assertThatThrownBy(() -> ofertas.cadastrar(dados)).isInstanceOf(RegraNegocioException.class);
        assertThat(ofertas.atualizarDados(oferta.getId(), dados).ativo()).isFalse();

        assertThatThrownBy(() -> ofertasRepository.saveAndFlush(CursoOfertado.builder()
                .curso(curso).faculdade(faculdade).modalidadeEnsino(ModalidadeEnsino.PRESENCIAL).build()))
                .isInstanceOf(DataIntegrityViolationException.class)
                .rootCause()
                .isInstanceOfSatisfying(SQLException.class, erro -> {
                    assertThat(erro.getSQLState()).isEqualTo("23505");
                    assertThat(erro.getMessage()).contains("uk_curso_faculdade_modalidade");
                });
    }
}
