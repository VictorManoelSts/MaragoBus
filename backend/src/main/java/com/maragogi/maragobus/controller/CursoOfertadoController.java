package com.maragogi.maragobus.controller;

import com.maragogi.maragobus.dto.cursoofertado.CadastroCursoOfertadoRequest;
import com.maragogi.maragobus.dto.cursoofertado.CursoOfertadoResponse;
import com.maragogi.maragobus.exception.RecursoNaoEncontradoException;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.service.CursoOfertadoService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.sql.SQLException;
import java.util.UUID;

@RestController
@Profile("curso-local")
@RequestMapping("/api/cursos-ofertados")
public class CursoOfertadoController {
    private final CursoOfertadoService cursoOfertadoService;

    public CursoOfertadoController(CursoOfertadoService cursoOfertadoService) {
        this.cursoOfertadoService = cursoOfertadoService;
    }

    @PostMapping
    public ResponseEntity<CursoOfertadoResponse> cadastrar(@Valid @RequestBody CadastroCursoOfertadoRequest dados) {
        CursoOfertadoResponse oferta = cursoOfertadoService.cadastrar(dados);
        var localizacao = ServletUriComponentsBuilder.fromCurrentRequestUri()
                .path("/{id}").buildAndExpand(oferta.id()).toUri();
        return ResponseEntity.created(localizacao).body(oferta);
    }

    @GetMapping
    public PagedModel<CursoOfertadoResponse> listar(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "false") boolean somenteAtivos,
            @RequestParam(required = false) UUID faculdadeId) {
        var pagina = PageRequest.of(page, size, Sort.by("curso.nome", "faculdade.nome", "modalidadeEnsino", "id"));
        return new PagedModel<>(cursoOfertadoService.listar(pagina, somenteAtivos, faculdadeId));
    }

    @GetMapping("/{id}")
    public CursoOfertadoResponse buscar(@PathVariable UUID id) {
        return cursoOfertadoService.buscarPorId(id);
    }

    @PutMapping("/{id}")
    public CursoOfertadoResponse atualizar(@PathVariable UUID id, @Valid @RequestBody CadastroCursoOfertadoRequest dados) {
        return cursoOfertadoService.atualizarDados(id, dados);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void desativar(@PathVariable UUID id) {
        cursoOfertadoService.desativar(id);
    }

    @PutMapping("/{id}/reativacao")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reativar(@PathVariable UUID id) {
        cursoOfertadoService.reativar(id);
    }

    @ExceptionHandler(RecursoNaoEncontradoException.class)
    public ProblemDetail tratarNaoEncontrado(RecursoNaoEncontradoException erro) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, erro.getMessage());
    }

    @ExceptionHandler(RegraNegocioException.class)
    public ProblemDetail tratarConflito(RegraNegocioException erro) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, erro.getMessage());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail tratarViolacaoDeUnicidade(DataIntegrityViolationException erro) {
        if (erro.getMostSpecificCause() instanceof SQLException sql && "23505".equals(sql.getSQLState())) {
            return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "Já existe uma oferta para este curso, faculdade e modalidade de ensino.");
        }
        throw erro;
    }
}
