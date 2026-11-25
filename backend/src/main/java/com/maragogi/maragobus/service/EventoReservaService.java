package com.maragogi.maragobus.service;

import com.maragogi.maragobus.dto.reserva.EventoReservaResponse;
import com.maragogi.maragobus.entity.EventoReserva;
import com.maragogi.maragobus.entity.Reserva;
import com.maragogi.maragobus.entity.Usuario;
import com.maragogi.maragobus.enums.StatusReserva;
import com.maragogi.maragobus.enums.TipoEventoReserva;
import com.maragogi.maragobus.enums.TipoUsuario;
import com.maragogi.maragobus.exception.RecursoNaoEncontradoException;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.EventoReservaRepository;
import com.maragogi.maragobus.repository.ReservaRepository;
import com.maragogi.maragobus.repository.UsuarioRepository;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Validated
public class EventoReservaService {
    private static final int TAMANHO_PADRAO = 10;
    private static final int TAMANHO_MAXIMO = 50;

    private final EventoReservaRepository eventos;
    private final ReservaRepository reservas;
    private final UsuarioRepository usuarios;

    public EventoReservaService(
            EventoReservaRepository eventos,
            ReservaRepository reservas,
            UsuarioRepository usuarios) {
        this.eventos = eventos;
        this.reservas = reservas;
        this.usuarios = usuarios;
    }

    @Transactional
    public EventoReservaResponse registrarCriacao(Reserva reserva, Usuario autor, LocalDateTime dataHoraEvento) {
        return salvarEvento(
                reserva,
                TipoEventoReserva.CRIACAO,
                null,
                reserva.getStatusReserva(),
                autor,
                "Reserva confirmada pelo aluno.",
                dataHoraEvento
        );
    }

    @Transactional
    public EventoReservaResponse registrarAlteracaoPontoEmbarque(
            Reserva reserva,
            Usuario autor,
            String pontoAnteriorNome,
            String pontoNovoNome,
            LocalDateTime dataHoraEvento) {
        String motivo = "Ponto de embarque alterado de '" + pontoAnteriorNome + "' para '" + pontoNovoNome + "'.";
        return salvarEvento(
                reserva,
                TipoEventoReserva.ALTERACAO_PONTO_EMBARQUE,
                StatusReserva.CONFIRMADA,
                reserva.getStatusReserva(),
                autor,
                motivo,
                dataHoraEvento
        );
    }

    @Transactional
    public EventoReservaResponse registrarCancelamentoPeloAluno(
            Reserva reserva,
            Usuario autor,
            String motivo,
            LocalDateTime dataHoraEvento) {
        String motivoNormalizado = (motivo == null || motivo.isBlank())
                ? "Cancelamento solicitado pelo aluno."
                : motivo.trim();
        return salvarEvento(
                reserva,
                TipoEventoReserva.CANCELAMENTO_PELO_ALUNO,
                StatusReserva.CONFIRMADA,
                StatusReserva.CANCELADA_PELO_ALUNO,
                autor,
                motivoNormalizado,
                dataHoraEvento
        );
    }

    @Transactional
    public EventoReservaResponse registrarCancelamentoPorSuspensao(
            Reserva reserva,
            Usuario autor,
            String motivo,
            LocalDateTime dataHoraEvento) {
        String motivoNormalizado = (motivo == null || motivo.isBlank())
                ? "Reserva cancelada automaticamente por suspensão vigente."
                : motivo.trim();
        return salvarEvento(
                reserva,
                TipoEventoReserva.CANCELAMENTO_POR_SUSPENSAO,
                StatusReserva.CONFIRMADA,
                StatusReserva.CANCELADA_POR_SUSPENSAO,
                autor,
                motivoNormalizado,
                dataHoraEvento
        );
    }

    @Transactional
    public EventoReservaResponse registrarCancelamentoSemFuncionamento(
            Reserva reserva,
            Usuario autor,
            String motivo,
            LocalDateTime dataHoraEvento) {
        return salvarEvento(
                reserva,
                TipoEventoReserva.CANCELAMENTO_SEM_FUNCIONAMENTO,
                StatusReserva.CONFIRMADA,
                StatusReserva.CANCELADA_SEM_FUNCIONAMENTO,
                autor,
                motivo,
                dataHoraEvento
        );
    }

    @Transactional(readOnly = true)
    public List<EventoReservaResponse> consultarPorReserva(
            @NotNull(message = "O solicitante é obrigatório.") UUID solicitanteId,
            @NotNull(message = "A reserva é obrigatória.") UUID reservaId) {
        Usuario solicitante = validarSolicitanteAtivo(solicitanteId);
        Reserva reserva = reservas.findById(reservaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Reserva não encontrada."));

        boolean autorizado = solicitante.getTipoUsuario() == TipoUsuario.ADMIN
                || (solicitante.getTipoUsuario() == TipoUsuario.ALUNO
                && reserva.getAluno().getId().equals(solicitanteId));
        if (!autorizado) {
            throw new RegraNegocioException("O usuário não tem permissão para consultar os eventos desta reserva.");
        }

        return eventos.findByReservaIdOrderByDataHoraEventoAscIdAsc(reservaId).stream()
                .map(this::mapear)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<EventoReservaResponse> consultarPorAluno(
            @NotNull(message = "O solicitante é obrigatório.") UUID solicitanteId,
            @NotNull(message = "O aluno é obrigatório.") UUID alunoId,
            int pagina,
            Integer tamanho) {
        int limite = validarPaginacao(pagina, tamanho);
        Usuario solicitante = validarSolicitanteAtivo(solicitanteId);

        boolean autorizado = solicitante.getTipoUsuario() == TipoUsuario.ADMIN
                || (solicitante.getTipoUsuario() == TipoUsuario.ALUNO
                && solicitanteId.equals(alunoId));
        if (!autorizado) {
            throw new RegraNegocioException("O usuário não tem permissão para consultar o histórico de eventos deste aluno.");
        }

        return eventos.findByAlunoIdOrderByDataHoraEventoDescIdAsc(alunoId, PageRequest.of(pagina, limite))
                .map(this::mapear);
    }

    private EventoReservaResponse salvarEvento(
            Reserva reserva,
            TipoEventoReserva tipoEvento,
            StatusReserva statusAnterior,
            StatusReserva statusNovo,
            Usuario autor,
            String motivo,
            LocalDateTime dataHoraEvento) {
        String pontoNome = reserva.getPontoEmbarqueNomeSnapshot() != null
                ? reserva.getPontoEmbarqueNomeSnapshot()
                : (reserva.getPontoEmbarque() == null ? null : reserva.getPontoEmbarque().getNome());

        EventoReserva salvo = eventos.saveAndFlush(EventoReserva.builder()
                .reservaId(reserva.getId())
                .alunoId(reserva.getAluno().getId())
                .tipoEvento(tipoEvento)
                .statusAnterior(statusAnterior)
                .statusNovo(statusNovo)
                .autorId(autor.getId())
                .autorNomeSnapshot(autor.getNome())
                .autorTipoSnapshot(autor.getTipoUsuario())
                .motivo(motivo)
                .dataHoraEvento(dataHoraEvento)
                .dataUtilizacaoSnapshot(reserva.getDataUtilizacao())
                .pontoEmbarqueIdSnapshot(reserva.getPontoEmbarque() == null ? null : reserva.getPontoEmbarque().getId())
                .pontoEmbarqueNomeSnapshot(pontoNome)
                .faculdadeIdSnapshot(reserva.getFaculdadeIdSnapshot())
                .faculdadeNomeSnapshot(reserva.getFaculdadeNomeSnapshot())
                .cursoNomeSnapshot(reserva.getCursoNomeSnapshot())
                .build());

        return mapear(salvo);
    }

    private Usuario validarSolicitanteAtivo(UUID solicitanteId) {
        Usuario solicitante = usuarios.findById(solicitanteId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));
        if (!solicitante.isAtivo()) {
            throw new RegraNegocioException("O usuário está inativo.");
        }
        return solicitante;
    }

    private int validarPaginacao(int pagina, Integer tamanho) {
        int limite = tamanho == null ? TAMANHO_PADRAO : tamanho;
        if (pagina < 0 || limite < 1 || limite > TAMANHO_MAXIMO) {
            throw new RegraNegocioException("Parâmetros de paginação inválidos.");
        }
        return limite;
    }

    private EventoReservaResponse mapear(EventoReserva e) {
        return new EventoReservaResponse(
                e.getId(),
                e.getReservaId(),
                e.getAlunoId(),
                e.getTipoEvento(),
                e.getStatusAnterior(),
                e.getStatusNovo(),
                e.getAutorId(),
                e.getAutorNomeSnapshot(),
                e.getAutorTipoSnapshot(),
                e.getMotivo(),
                e.getDataHoraEvento(),
                e.getDataUtilizacaoSnapshot(),
                e.getPontoEmbarqueIdSnapshot(),
                e.getPontoEmbarqueNomeSnapshot(),
                e.getFaculdadeIdSnapshot(),
                e.getFaculdadeNomeSnapshot(),
                e.getCursoNomeSnapshot()
        );
    }
}