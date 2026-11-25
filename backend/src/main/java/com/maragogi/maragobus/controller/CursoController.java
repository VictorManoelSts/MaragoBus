package com.maragogi.maragobus.controller;

import com.maragogi.maragobus.dto.curso.AtualizacaoCursoRequest;
import com.maragogi.maragobus.dto.curso.CadastroCursoRequest;
import com.maragogi.maragobus.dto.curso.CursoResponse;
import com.maragogi.maragobus.exception.RecursoNaoEncontradoException;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.service.CursoService;
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
@RequestMapping("/api/cursos")
public class CursoController {
    private final CursoService cursoService;

    public CursoController(CursoService cursoService) {
        this.cursoService = cursoService;
    }

    @PostMapping
    public ResponseEntity<CursoResponse> cadastrar(@Valid @RequestBody CadastroCursoRequest dados) {
        CursoResponse curso = cursoService.cadastrar(dados);
        var localizacao = ServletUriComponentsBuilder.fromCurrentRequestUri()
                .path("/{id}").buildAndExpand(curso.id()).toUri();
        return ResponseEntity.created(localizacao).body(curso);
    }

    @GetMapping
    public PagedModel<CursoResponse> listar(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "false") boolean somenteAtivos) {
        var pagina = PageRequest.of(page, size, Sort.by("nome", "id"));
        return new PagedModel<>(cursoService.listar(pagina, somenteAtivos));
    }

    @GetMapping("/{id}")
    public CursoResponse buscar(@PathVariable UUID id) {
        return cursoService.buscarPorId(id);
    }

    @PutMapping("/{id}")
    public CursoResponse atualizar(@PathVariable UUID id, @Valid @RequestBody AtualizacaoCursoRequest dados) {
        return cursoService.atualizarDados(id, dados);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void desativar(@PathVariable UUID id) {
        cursoService.desativar(id);
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
        // O PostgreSQL também pode detectar o nome duplicado no commit de uma transação concorrente.
        if (erro.getMostSpecificCause() instanceof SQLException sql && "23505".equals(sql.getSQLState())) {
            return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "Já existe um curso com este nome.");
        }
        throw erro;
    }
}
