package com.maragogi.maragobus.service;

import com.maragogi.maragobus.domain.reserva.RegrasTemporaisReserva;
import com.maragogi.maragobus.dto.distribuicao.*;
import com.maragogi.maragobus.entity.*;
import com.maragogi.maragobus.enums.AcaoAuditoriaDistribuicao;
import com.maragogi.maragobus.enums.StatusDistribuicaoTransporte;
import com.maragogi.maragobus.enums.StatusReserva;
import com.maragogi.maragobus.enums.TipoUsuario;
import com.maragogi.maragobus.exception.RecursoNaoEncontradoException;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.*;

@Service
@Validated
public class DistribuicaoTransporteService {
    private static final ZoneId FUSO = ZoneId.of("America/Maceio");
    private static final LocalTime HORARIO_LIMITE_OPERACIONAL = LocalTime.of(17, 0);
    private static final int TAMANHO_PADRAO = 10;
    private static final int TAMANHO_MAXIMO = 50;

    private final DistribuicaoTransporteRepository distribuicoes;
    private final ItemDistribuicaoTransporteRepository itensRepository;
    private final HistoricoDistribuicaoTransporteRepository historicoRepository;
    private final UsuarioRepository usuarios;
    private final FaculdadeRepository faculdades;
    private final ReservaRepository reservas;
    private final DataSemFuncionamentoRepository datasSemFuncionamento;
    private final RegrasTemporaisReserva regrasTemporaisReserva;
    private final Clock clock;

    public DistribuicaoTransporteService(
            DistribuicaoTransporteRepository distribuicoes,
            ItemDistribuicaoTransporteRepository itensRepository,
            HistoricoDistribuicaoTransporteRepository historicoRepository,
            UsuarioRepository usuarios,
            FaculdadeRepository faculdades,
            ReservaRepository reservas,
            DataSemFuncionamentoRepository datasSemFuncionamento,
            RegrasTemporaisReserva regrasTemporaisReserva,
            Clock clock) {
        this.distribuicoes = distribuicoes;
        this.itensRepository = itensRepository;
        this.historicoRepository = historicoRepository;
        this.usuarios = usuarios;
        this.faculdades = faculdades;
        this.reservas = reservas;
        this.datasSemFuncionamento = datasSemFuncionamento;
        this.regrasTemporaisReserva = regrasTemporaisReserva;
        this.clock = clock.withZone(FUSO);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public DistribuicaoTransporteResponse salvarRascunho(
            @NotNull(message = "O motorista editor é obrigatório.") UUID motoristaEditorId,
            @NotNull(message = "Os dados da distribuição são obrigatórios.") @Valid SalvarDistribuicaoRequest dados) {
        Usuario editor = validarMotoristaAtivo(motoristaEditorId, "Somente motoristas podem gerenciar a distribuição.");
        LocalDateTime agora = LocalDateTime.now(clock);
        LocalDate data = dados.dataUtilizacao();

        validarDataEJanelaOperacional(data, agora);
        List<ParFaculdadeMotorista> paresValidados = validarItens(dados.itens());

        Optional<DistribuicaoTransporte> existenteOpt = distribuicoes.findByDataUtilizacaoComLock(data);
        DistribuicaoTransporte distribuicao;
        AcaoAuditoriaDistribuicao acao;

        if (existenteOpt.isEmpty()) {
            if (dados.versaoEsperada() != null) {
                throw new RegraNegocioException("A distribuição ainda não existe para a data informada.");
            }
            distribuicao = distribuicoes.saveAndFlush(DistribuicaoTransporte.builder()
                    .dataUtilizacao(data)
                    .status(StatusDistribuicaoTransporte.RASCUNHO)
                    .numeroRevisao(1)
                    .ultimoEditor(editor)
                    .dataHoraUltimaEdicao(agora)
                    .build());
            acao = AcaoAuditoriaDistribuicao.CRIACAO;
        } else {
            distribuicao = existenteOpt.get();
            if (dados.versaoEsperada() == null || !dados.versaoEsperada().equals(distribuicao.getVersao())) {
                throw new RegraNegocioException(
                        "Conflito de versão: a distribuição foi alterada por outro motorista. Recarregue os dados antes de salvar.");
            }
            distribuicao.setStatus(StatusDistribuicaoTransporte.RASCUNHO);
            distribuicao.setNumeroRevisao(distribuicao.getNumeroRevisao() + 1);
            distribuicao.setUltimoEditor(editor);
            distribuicao.setDataHoraUltimaEdicao(agora);
            itensRepository.deleteByDistribuicaoId(distribuicao.getId());
            distribuicao = distribuicoes.saveAndFlush(distribuicao);
            acao = AcaoAuditoriaDistribuicao.EDICAO;
        }

        List<ItemDistribuicaoTransporte> novosItens = new ArrayList<>();
        for (ParFaculdadeMotorista par : paresValidados) {
            novosItens.add(ItemDistribuicaoTransporte.builder()
                    .distribuicao(distribuicao)
                    .faculdade(par.faculdade())
                    .motorista(par.motorista())
                    .build());
        }
        itensRepository.saveAllAndFlush(novosItens);

        String resumo = acao == AcaoAuditoriaDistribuicao.CRIACAO
                ? "Criação do rascunho com " + novosItens.size() + " atribuição(ões)."
                : "Edição do rascunho com " + novosItens.size() + " atribuição(ões).";

        historicoRepository.save(HistoricoDistribuicaoTransporte.builder()
                .distribuicao(distribuicao)
                .numeroRevisao(distribuicao.getNumeroRevisao())
                .acao(acao)
                .motoristaResponsavel(editor)
                .dataHora(agora)
                .resumoAlteracao(resumo)
                .build());

        List<ItemDistribuicaoTransporte> itensOrdenados = itensRepository.findByDistribuicaoIdOrdenado(distribuicao.getId());
        return mapearDistribuicao(distribuicao, itensOrdenados);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public DistribuicaoTransporteResponse publicar(
            @NotNull(message = "O motorista publicador é obrigatório.") UUID motoristaPublicadorId,
            @NotNull(message = "Os dados de publicação são obrigatórios.") @Valid PublicarDistribuicaoRequest dados) {
        Usuario publicador = validarMotoristaAtivo(motoristaPublicadorId, "Somente motoristas podem publicar a distribuição.");
        LocalDateTime agora = LocalDateTime.now(clock);
        LocalDate data = dados.dataUtilizacao();

        validarDataEJanelaOperacional(data, agora);

        DistribuicaoTransporte distribuicao = distribuicoes.findByDataUtilizacaoComLock(data)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Distribuição não encontrada para a data informada."));

        if (!dados.versaoEsperada().equals(distribuicao.getVersao())) {
            throw new RegraNegocioException(
                    "Conflito de versão: a distribuição foi alterada por outro motorista. Recarregue os dados antes de publicar.");
        }

        List<ItemDistribuicaoTransporte> itens = itensRepository.findByDistribuicaoIdOrdenado(distribuicao.getId());
        if (itens.isEmpty()) {
            throw new RegraNegocioException("Não é possível publicar uma distribuição sem atribuições.");
        }

        Set<UUID> faculdadesCobertas = new HashSet<>();
        for (ItemDistribuicaoTransporte item : itens) {
            Usuario motoristaAtribuido = item.getMotorista();
            if (motoristaAtribuido.getTipoUsuario() != TipoUsuario.MOTORISTA || !motoristaAtribuido.isAtivo()) {
                throw new RegraNegocioException("Todos os motoristas atribuídos na distribuição devem estar ativos.");
            }
            faculdadesCobertas.add(item.getFaculdade().getId());
        }

        var resumoReservas = reservas.resumirPorFaculdadeEPonto(data, StatusReserva.CONFIRMADA);
        for (var linha : resumoReservas) {
            if (linha.faculdadeId() == null) {
                throw new RegraNegocioException("Inconsistência: reserva confirmada sem vínculo acadêmico com faculdade.");
            }
            if (!faculdadesCobertas.contains(linha.faculdadeId())) {
                throw new RegraNegocioException(
                        "Todas as faculdades com reservas confirmadas devem estar cobertas antes da publicação.");
            }
        }

        distribuicao.setStatus(StatusDistribuicaoTransporte.PUBLICADA);
        distribuicao.setNumeroRevisao(distribuicao.getNumeroRevisao() + 1);
        distribuicao.setUltimoEditor(publicador);
        distribuicao.setDataHoraUltimaEdicao(agora);
        distribuicao.setPublicadoPor(publicador);
        distribuicao.setDataHoraPublicacao(agora);
        distribuicao = distribuicoes.saveAndFlush(distribuicao);

        historicoRepository.save(HistoricoDistribuicaoTransporte.builder()
                .distribuicao(distribuicao)
                .numeroRevisao(distribuicao.getNumeroRevisao())
                .acao(AcaoAuditoriaDistribuicao.PUBLICACAO)
                .motoristaResponsavel(publicador)
                .dataHora(agora)
                .resumoAlteracao("Publicação da distribuição com " + itens.size() + " atribuição(ões).")
                .build());

        return mapearDistribuicao(distribuicao, itens);
    }

    @Transactional(readOnly = true)
    public DistribuicaoTransporteResponse consultarPorData(
            @NotNull(message = "O motorista é obrigatório.") UUID motoristaId,
            @NotNull(message = "A data de utilização é obrigatória.") LocalDate dataUtilizacao) {
        validarMotoristaAtivo(motoristaId, "Somente motoristas podem consultar a distribuição.");
        DistribuicaoTransporte distribuicao = distribuicoes.findByDataUtilizacao(dataUtilizacao)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Distribuição não encontrada para a data informada."));
        List<ItemDistribuicaoTransporte> itens = itensRepository.findByDistribuicaoIdOrdenado(distribuicao.getId());
        return mapearDistribuicao(distribuicao, itens);
    }

    @Transactional(readOnly = true)
    public Page<HistoricoDistribuicaoResponse> consultarHistorico(
            @NotNull(message = "O motorista é obrigatório.") UUID motoristaId,
            @NotNull(message = "A data de utilização é obrigatória.") LocalDate dataUtilizacao,
            int pagina,
            Integer tamanho) {
        int limite = tamanho == null ? TAMANHO_PADRAO : tamanho;
        if (pagina < 0 || limite < 1 || limite > TAMANHO_MAXIMO) {
            throw new RegraNegocioException("Parâmetros de paginação inválidos.");
        }
        validarMotoristaAtivo(motoristaId, "Somente motoristas podem consultar o histórico da distribuição.");
        DistribuicaoTransporte distribuicao = distribuicoes.findByDataUtilizacao(dataUtilizacao)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Distribuição não encontrada para a data informada."));

        return historicoRepository.findByDistribuicaoId(distribuicao.getId(), PageRequest.of(pagina, limite))
                .map(h -> new HistoricoDistribuicaoResponse(
                        h.getId(),
                        h.getNumeroRevisao(),
                        h.getAcao(),
                        h.getMotoristaResponsavel().getId(),
                        h.getMotoristaResponsavel().getNome(),
                        h.getDataHora(),
                        h.getResumoAlteracao()
                ));
    }

    private Usuario validarMotoristaAtivo(UUID motoristaId, String mensagemTipo) {
        Usuario motorista = usuarios.findById(motoristaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));
        if (motorista.getTipoUsuario() != TipoUsuario.MOTORISTA) {
            throw new RegraNegocioException(mensagemTipo);
        }
        if (!motorista.isAtivo()) {
            throw new RegraNegocioException("O motorista está inativo.");
        }
        return motorista;
    }

    private void validarDataEJanelaOperacional(LocalDate data, LocalDateTime agora) {
        LocalDate hoje = agora.toLocalDate();
        if (data.isBefore(hoje)) {
            throw new RegraNegocioException("Não é permitido alterar ou publicar distribuição para datas passadas.");
        }
        if (!regrasTemporaisReserva.ehDiaTransporte(data) || datasSemFuncionamento.existsByData(data)) {
            throw new RegraNegocioException("Não há funcionamento do transporte na data informada.");
        }
        if (data.equals(hoje) && !agora.toLocalTime().isBefore(HORARIO_LIMITE_OPERACIONAL)) {
            throw new RegraNegocioException("O horário limite para edição ou publicação da distribuição do dia já foi encerrado.");
        }
    }

    private List<ParFaculdadeMotorista> validarItens(List<ItemDistribuicaoRequest> itens) {
        Set<UUID> faculdadesVistas = new HashSet<>();
        List<ParFaculdadeMotorista> resultado = new ArrayList<>();

        for (ItemDistribuicaoRequest item : itens) {
            if (!faculdadesVistas.add(item.faculdadeId())) {
                throw new RegraNegocioException("Não é permitido atribuir a mesma faculdade mais de uma vez na distribuição.");
            }
            Faculdade faculdade = faculdades.findById(item.faculdadeId())
                    .orElseThrow(() -> new RecursoNaoEncontradoException("Faculdade não encontrada."));
            Usuario motorista = validarMotoristaAtivo(
                    item.motoristaId(), "Apenas motoristas podem ser atribuídos na distribuição.");
            resultado.add(new ParFaculdadeMotorista(faculdade, motorista));
        }
        return resultado;
    }

    private DistribuicaoTransporteResponse mapearDistribuicao(
            DistribuicaoTransporte d, List<ItemDistribuicaoTransporte> itens) {
        List<ItemDistribuicaoResponse> itensResp = itens.stream()
                .map(i -> new ItemDistribuicaoResponse(
                        i.getFaculdade().getId(),
                        i.getFaculdade().getNome(),
                        i.getMotorista().getId(),
                        i.getMotorista().getNome()))
                .toList();

        return new DistribuicaoTransporteResponse(
                d.getId(),
                d.getDataUtilizacao(),
                d.getStatus(),
                d.getVersao(),
                d.getNumeroRevisao(),
                d.getUltimoEditor().getId(),
                d.getUltimoEditor().getNome(),
                d.getDataHoraUltimaEdicao(),
                d.getPublicadoPor() == null ? null : d.getPublicadoPor().getId(),
                d.getPublicadoPor() == null ? null : d.getPublicadoPor().getNome(),
                d.getDataHoraPublicacao(),
                itensResp
        );
    }

    private record ParFaculdadeMotorista(Faculdade faculdade, Usuario motorista) {}
}