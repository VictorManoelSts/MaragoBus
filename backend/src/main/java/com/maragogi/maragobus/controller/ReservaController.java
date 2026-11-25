package com.maragogi.maragobus.controller;

import com.maragogi.maragobus.dto.reserva.AtualizacaoPontoEmbarqueReservaRequest;
import com.maragogi.maragobus.dto.reserva.CriacaoReservaAlunoRequest;
import com.maragogi.maragobus.dto.reserva.PainelReservasAlunoResponse;
import com.maragogi.maragobus.dto.reserva.ReservaResponse;
import com.maragogi.maragobus.exception.RecursoNaoEncontradoException;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.exception.ReservaDeOutroAlunoException;
import com.maragogi.maragobus.security.AlunoAutenticado;
import com.maragogi.maragobus.service.ReservaService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.context.annotation.Profile;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@RestController
@Profile("curso-local")
@RequestMapping("/api/reservas")
public class ReservaController {
    private final ReservaService reservaService;

    public ReservaController(ReservaService reservaService) {
        this.reservaService = reservaService;
    }

    @PostMapping
    public ReservaResponse cadastrar(Authentication autenticacao,
                                      @Valid @RequestBody CriacaoReservaAlunoRequest dados) {
        return reservaService.reservarProximaDataDisponivel(alunoId(autenticacao), dados.pontoEmbarqueId());
    }

    @GetMapping("/atual")
    public PainelReservasAlunoResponse consultarAtual(Authentication autenticacao) {
        return reservaService.consultarPainel(alunoId(autenticacao));
    }

    @GetMapping("/historico")
    public PagedModel<ReservaResponse> consultarHistorico(Authentication autenticacao,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size) {
        return new PagedModel<>(reservaService.consultarHistorico(alunoId(autenticacao), page, size));
    }

    @PatchMapping("/{id}/ponto")
    public ReservaResponse alterarPonto(Authentication autenticacao, @PathVariable UUID id,
                                        @Valid @RequestBody AtualizacaoPontoEmbarqueReservaRequest dados) {
        return reservaService.alterarPontoEmbarque(alunoId(autenticacao), id, dados);
    }

    @PostMapping("/{id}/cancelamento")
    public ReservaResponse cancelar(Authentication autenticacao, @PathVariable UUID id) {
        return reservaService.cancelar(alunoId(autenticacao), id);
    }

    private UUID alunoId(Authentication autenticacao) {
        if (autenticacao != null && autenticacao.isAuthenticated()
                && autenticacao.getPrincipal() instanceof AlunoAutenticado aluno
                && autenticacao.getAuthorities().stream().anyMatch(a -> "ROLE_ALUNO".equals(a.getAuthority()))) {
            return aluno.id();
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Identidade de aluno exigida.");
    }

    @ExceptionHandler(RecursoNaoEncontradoException.class)
    public ProblemDetail tratarNaoEncontrado(RecursoNaoEncontradoException erro) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, erro.getMessage());
    }

    @ExceptionHandler(ReservaDeOutroAlunoException.class)
    public ProblemDetail tratarReservaDeOutroAluno() {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "Reserva não encontrada.");
    }

    @ExceptionHandler(RegraNegocioException.class)
    public ProblemDetail tratarConflito(RegraNegocioException erro) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, erro.getMessage());
    }
}
