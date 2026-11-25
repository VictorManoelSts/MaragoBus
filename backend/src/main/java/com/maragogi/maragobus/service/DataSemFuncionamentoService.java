package com.maragogi.maragobus.service;

import com.maragogi.maragobus.domain.reserva.RegrasTemporaisReserva;
import com.maragogi.maragobus.domain.suspensao.RegrasTemporaisSuspensao;
import com.maragogi.maragobus.dto.datasemfuncionamento.CadastroDataSemFuncionamentoRequest;
import com.maragogi.maragobus.dto.datasemfuncionamento.DataSemFuncionamentoResponse;
import com.maragogi.maragobus.entity.DataSemFuncionamento;
import com.maragogi.maragobus.entity.Reserva;
import com.maragogi.maragobus.entity.Suspensao;
import com.maragogi.maragobus.entity.Usuario;
import com.maragogi.maragobus.enums.StatusReserva;
import com.maragogi.maragobus.enums.TipoUsuario;
import com.maragogi.maragobus.exception.RecursoNaoEncontradoException;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.DataSemFuncionamentoRepository;
import com.maragogi.maragobus.repository.ReservaRepository;
import com.maragogi.maragobus.repository.SuspensaoRepository;
import com.maragogi.maragobus.repository.UsuarioRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@Validated
public class DataSemFuncionamentoService {
    private static final ZoneId FUSO = ZoneId.of("America/Maceio");
    private static final int TAMANHO_PADRAO = 10;
    private static final int TAMANHO_MAXIMO = 50;
    private static final int TAMANHO_MAXIMO_MOTIVO = 500;

    private final DataSemFuncionamentoRepository datasSemFuncionamento;
    private final UsuarioRepository usuarios;
    private final ReservaRepository reservas;
    private final SuspensaoRepository suspensoes;
    private final RegrasTemporaisReserva regrasTemporaisReserva;
    private final RegrasTemporaisSuspensao regrasTemporaisSuspensao;
    private final EventoReservaService eventos;
    private final Clock clock;

    public DataSemFuncionamentoService(
            DataSemFuncionamentoRepository datasSemFuncionamento,
            UsuarioRepository usuarios,
            ReservaRepository reservas,
            SuspensaoRepository suspensoes,
            RegrasTemporaisReserva regrasTemporaisReserva,
            RegrasTemporaisSuspensao regrasTemporaisSuspensao,
            EventoReservaService eventos,
            Clock clock) {
        this.datasSemFuncionamento = datasSemFuncionamento;
        this.usuarios = usuarios;
        this.reservas = reservas;
        this.suspensoes = suspensoes;
        this.regrasTemporaisReserva = regrasTemporaisReserva;
        this.regrasTemporaisSuspensao = regrasTemporaisSuspensao;
        this.eventos = eventos;
        this.clock = clock.withZone(FUSO);
    }

    @Transactional
    public DataSemFuncionamentoResponse cadastrar(
            @NotNull(message = "O administrador é obrigatório.") UUID administradorId,
            @NotNull(message = "Os dados da data sem funcionamento são obrigatórios.") @Valid
            CadastroDataSemFuncionamentoRequest dados) {
        String motivoNormalizado = normalizarMotivo(dados.motivo());
        Usuario admin = validarAdministrador(administradorId);

        datasSemFuncionamento.bloquearCalendarioParaAlteracao();
        LocalDateTime agora = LocalDateTime.now(clock);
        LocalDate hoje = agora.toLocalDate();
        LocalDate data = dados.data();

        if (data.isBefore(hoje)) {
            throw new RegraNegocioException("Não é permitido cadastrar uma data passada sem funcionamento.");
        }
        if (!regrasTemporaisReserva.ehDiaTransporte(data)) {
            throw new RegraNegocioException("Sábados e domingos já não possuem funcionamento do transporte.");
        }
        if (datasSemFuncionamento.existsByData(data)) {
            throw new RegraNegocioException("Já existe um bloqueio cadastrado para a data informada.");
        }

        DataSemFuncionamento registro = datasSemFuncionamento.saveAndFlush(DataSemFuncionamento.builder()
                .data(data)
                .motivo(motivoNormalizado)
                .administradorResponsavel(admin)
                .dataHoraCadastro(agora)
                .build());

        List<Reserva> reservasAfetadas = reservas.findByDataUtilizacaoAndStatusReservaOrderById(data, StatusReserva.CONFIRMADA);
        for (Reserva reserva : reservasAfetadas) {
            reserva.setStatusReserva(StatusReserva.CANCELADA_SEM_FUNCIONAMENTO);
            reserva.setDataHoraCancelamento(agora);
            eventos.registrarCancelamentoSemFuncionamento(reserva, admin, motivoNormalizado, agora);
        }

        List<Suspensao> suspensoesAfetadas = suspensoes.findSuspensoesQueCobremData(data);
        if (!suspensoesAfetadas.isEmpty()) {
            Set<LocalDate> bloqueiosFuturos = new HashSet<>(datasSemFuncionamento.findDatasAPartirDe(hoje));
            bloqueiosFuturos.add(data);

            for (Suspensao suspensao : suspensoesAfetadas) {
                LocalDate novaDataFim = regrasTemporaisSuspensao.estenderDataFim(
                        suspensao.getDataFim(), bloqueiosFuturos);

                UUID alunoId = suspensao.getAdvertenciaOrigem()
                        .getSolicitacaoAdvertencia()
                        .getAluno()
                        .getId();
                LocalDate primeiroDiaDaExtensao = suspensao.getDataFim().plusDays(1);
                if (suspensoes.existeSobreposicao(alunoId, suspensao.getId(), primeiroDiaDaExtensao, novaDataFim)) {
                    throw new RegraNegocioException("A extensão da suspensão sobrepõe outro período.");
                }
                suspensao.setDataFim(novaDataFim);
                List<Reserva> reservasNaNovaData = reservas.findByAlunoIdAndStatusReservaAndDataUtilizacaoBetweenOrderById(
                        alunoId, StatusReserva.CONFIRMADA, novaDataFim, novaDataFim);
                for (Reserva reserva : reservasNaNovaData) {
                    reserva.setStatusReserva(StatusReserva.CANCELADA_POR_SUSPENSAO);
                    reserva.setDataHoraCancelamento(agora);
                    eventos.registrarCancelamentoPorSuspensao(reserva, admin,
                            "Reserva cancelada automaticamente por extensão da suspensão após bloqueio da data "
                                    + data + ".", agora);
                }
            }
        }

        return mapear(registro, reservasAfetadas.size(), suspensoesAfetadas.size());
    }

    @Transactional(readOnly = true)
    public Page<DataSemFuncionamentoResponse> consultarTodas(
            @NotNull(message = "O administrador é obrigatório.") UUID administradorId,
            int pagina,
            Integer tamanho) {
        Pageable pageable = criarPageable(pagina, tamanho);
        validarAdministrador(administradorId);
        return datasSemFuncionamento.findAllComAdministrador(pageable)
                .map(d -> mapear(d, 0, 0));
    }

    @Transactional
    public void remover(
            @NotNull(message = "O administrador é obrigatório.") UUID administradorId,
            @NotNull(message = "O identificador da data sem funcionamento é obrigatório.") UUID id) {
        validarAdministrador(administradorId);
        DataSemFuncionamento registro = datasSemFuncionamento.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Data sem funcionamento não encontrada."));

        datasSemFuncionamento.bloquearCalendarioParaAlteracao();
        LocalDate hoje = LocalDate.now(clock);
        if (registro.getData().isBefore(hoje)) {
            throw new RegraNegocioException("Não é permitido remover uma data sem funcionamento passada.");
        }
        datasSemFuncionamento.delete(registro);
    }

    private Usuario validarAdministrador(UUID administradorId) {
        Usuario admin = usuarios.findById(administradorId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Administrador não encontrado."));
        if (admin.getTipoUsuario() != TipoUsuario.ADMIN) {
            throw new RegraNegocioException("Apenas administradores podem gerenciar datas sem funcionamento.");
        }
        if (!admin.isAtivo()) {
            throw new RegraNegocioException("Administrador inativo não pode gerenciar datas sem funcionamento.");
        }
        return admin;
    }

    private String normalizarMotivo(String motivo) {
        if (motivo == null || motivo.isBlank()) {
            throw new RegraNegocioException("O motivo é obrigatório.");
        }
        String normalizado = motivo.trim();
        if (normalizado.length() > TAMANHO_MAXIMO_MOTIVO) {
            throw new RegraNegocioException("O motivo deve ter no máximo 500 caracteres.");
        }
        return normalizado;
    }

    private Pageable criarPageable(int pagina, Integer tamanho) {
        int limite = tamanho == null ? TAMANHO_PADRAO : tamanho;
        if (pagina < 0 || limite < 1 || limite > TAMANHO_MAXIMO) {
            throw new RegraNegocioException("Parâmetros de paginação inválidos.");
        }
        return PageRequest.of(pagina, limite, Sort.by(Sort.Order.asc("data"), Sort.Order.asc("id")));
    }

    private DataSemFuncionamentoResponse mapear(
            DataSemFuncionamento d, long reservasCanceladas, long suspensoesEstendidas) {
        return new DataSemFuncionamentoResponse(
                d.getId(),
                d.getData(),
                d.getMotivo(),
                d.getAdministradorResponsavel().getId(),
                d.getAdministradorResponsavel().getNome(),
                d.getDataHoraCadastro(),
                reservasCanceladas,
                suspensoesEstendidas
        );
    }
}